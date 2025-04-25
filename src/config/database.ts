/**
 * Configuração e gerenciamento do banco de dados usando Prisma
 * Versão com solução para problemas de compilação no TypeScript
 */

// Importação do carregador personalizado para o Prisma Client
// @ts-ignore - ignoramos verificação de tipos para este import
const { PrismaClient, Prisma } = require("../../scripts/prisma-loader");

import { env } from "./environment";
import { logger } from "@/shared/utils/logger.utils";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

// Definição do tipo TransactionIsolationLevel para compatibilidade
type TransactionIsolationLevel =
  | "ReadUncommitted"
  | "ReadCommitted"
  | "RepeatableRead"
  | "Snapshot"
  | "Serializable";

// Tipos de eventos de log do Prisma
type PrismaLogLevel = "query" | "info" | "warn" | "error";

// Interface para opções de configuração do banco de dados
interface DatabaseOptions {
  logLevels?: PrismaLogLevel[];
  maxConnections?: number;
  minConnections?: number;
  connectionTimeout?: number;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  enableExtensions?: boolean;
  enableQueryEvents?: boolean;
}

// Interface para callbacks de eventos de consulta
interface QueryEventCallbacks {
  onQuery?: (query: string, params: any, duration: number) => void;
  onSuccess?: (
    query: string,
    params: any,
    duration: number,
    result: any
  ) => void;
  onError?: (query: string, params: any, error: Error) => void;
}

// Interface para eventos do ciclo de vida do banco de dados
interface DatabaseLifecycleEvents {
  onBeforeConnect?: () => Promise<void>;
  onConnect?: () => Promise<void>;
  onDisconnect?: () => Promise<void>;
  onReconnect?: (attempt: number) => Promise<void>;
}

// Interface para resultados de verificação de saúde
export interface DatabaseHealthStatus {
  status: "ok" | "error";
  responseTime: number;
  connections?: {
    current: number;
    min: number;
    max: number;
  };
  error?: {
    message: string;
    code?: string;
  };
  version?: string;
  details?: any;
}

/**
 * Classe DatabaseManager
 *
 * Implementa o padrão Singleton para gerenciar a conexão com o
 * banco de dados utilizando o Prisma ORM, com suporte a reconexão
 * automática, pool de conexões e logs detalhados.
 */
export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private prisma: any; // Usando any para evitar problemas de tipo
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private connectionAttempts: number = 0;
  private queryEventCallbacks: QueryEventCallbacks = {};
  private lifecycleEvents: DatabaseLifecycleEvents = {};
  private metrics = {
    totalQueries: 0,
    failedQueries: 0,
    slowQueries: 0,
    lastQuery: "",
    avgResponseTime: 0,
    responseTimeAccumulator: 0,
    connectionEstablishedAt: null as Date | null,
    lastReconnectAt: null as Date | null,
    reconnectAttempts: 0,
  };

  // Valores padrão para as opções de configuração
  private readonly defaultOptions: Required<DatabaseOptions> = {
    logLevels: ["error", "warn"],
    maxConnections: env.databasePoolMax,
    minConnections: env.databasePoolMin,
    connectionTimeout: 30000, // 30 segundos
    reconnectAttempts: 5,
    reconnectInterval: 5000, // 5 segundos
    enableExtensions: true,
    enableQueryEvents: false,
  };

  // Opções atuais de configuração
  private readonly options: Required<DatabaseOptions>;

  /**
   * Construtor privado para implementar o padrão Singleton
   * @param options Opções de configuração do banco de dados
   */
  private constructor(options: DatabaseOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };

    // Configura os níveis de log com base no ambiente
    const logLevels = this.getLogLevels();

    try {
      // Verifica se os arquivos de cliente Prisma existem
      this.verifyPrismaClientExists();

      // Inicializa o cliente Prisma com as configurações
      this.prisma = new PrismaClient({
        log: logLevels,
        datasources: {
          db: {
            url: env.databaseUrl,
          },
        },
      });

      logger.debug("Cliente Prisma inicializado com sucesso");
    } catch (error) {
      // Se falhar na primeira tentativa, tenta regenerar
      logger.warn("Falha ao inicializar PrismaClient, tentando regenerar...", {
        error: error instanceof Error ? error.message : String(error),
      });

      this.regeneratePrismaClient();

      // Tenta novamente após regenerar
      try {
        this.prisma = new PrismaClient({
          log: logLevels,
          datasources: {
            db: {
              url: env.databaseUrl,
            },
          },
        });

        logger.info("PrismaClient regenerado e inicializado com sucesso");
      } catch (regenerateError) {
        logger.error(
          "Falha crítica ao inicializar PrismaClient, mesmo após regeneração",
          {
            error:
              regenerateError instanceof Error
                ? regenerateError.message
                : String(regenerateError),
          }
        );

        throw new Error(
          "Não foi possível inicializar o Prisma Client. Verifique se o esquema do Prisma está correto e tente executar 'prisma generate' manualmente."
        );
      }
    }

    // Configurar middleware para capturar queries, caso os eventos não estejam disponíveis
    this.setupQueryMiddleware();

    logger.info("Gerenciador de banco de dados inicializado", {
      poolSize: `${this.options.minConnections}-${this.options.maxConnections}`,
      logLevels: this.options.logLevels,
      reconnectAttempts: this.options.reconnectAttempts,
    });
  }

  /**
   * Configura middleware para capturar queries do Prisma
   * Esta é uma alternativa ao uso de eventos que pode não ser compatível com todas as versões
   */
  private setupQueryMiddleware(): void {
    if (typeof this.prisma.$use === "function") {
      this.prisma.$use(async (params: any, next: any) => {
        const startTime = performance.now();

        try {
          // Executa a operação original
          const result = await next(params);

          // Calcula duração e registra métricas
          const duration = performance.now() - startTime;

          if (this.queryEventCallbacks.onQuery) {
            this.queryEventCallbacks.onQuery(
              `${params.model}.${params.action}`,
              params.args || {},
              duration
            );
          }

          if (this.queryEventCallbacks.onSuccess) {
            this.queryEventCallbacks.onSuccess(
              `${params.model}.${params.action}`,
              params.args || {},
              duration,
              result
            );
          }

          // Registra métrica
          this.recordQueryMetric({
            query: `${params.model}.${params.action}`,
            duration,
            success: true,
          });

          return result;
        } catch (error) {
          // Calcula duração e registra erro
          const duration = performance.now() - startTime;

          if (this.queryEventCallbacks.onError) {
            this.queryEventCallbacks.onError(
              `${params.model}.${params.action}`,
              params.args || {},
              error instanceof Error ? error : new Error(String(error))
            );
          }

          // Registra métrica de erro
          this.recordQueryMetric({
            query: `${params.model}.${params.action}`,
            duration,
            success: false,
          });

          throw error;
        }
      });

      logger.debug("Middleware de queries do Prisma configurado");
    }
  }

  /**
   * Verifica se os arquivos gerados do Prisma Client existem
   * Útil para diagnóstico de problemas de inicialização
   */
  private verifyPrismaClientExists(): void {
    // Verificamos o arquivo index.js que deve existir nas instalações do Prisma Client
    const possiblePaths = [
      path.resolve(process.cwd(), "node_modules/.prisma/client/index.js"),
      path.resolve(process.cwd(), "node_modules/@prisma/client/index.js"),
      path.resolve(
        process.cwd(),
        "prisma/node_modules/.prisma/client/index.js"
      ),
      path.resolve(
        process.cwd(),
        "node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/index.js"
      ),
    ];

    const foundPath = possiblePaths.find((p) => fs.existsSync(p));

    if (!foundPath) {
      logger.warn(
        "Arquivos do Prisma Client não encontrados nos caminhos esperados",
        { checkedPaths: possiblePaths }
      );
    } else {
      logger.debug("Arquivos do Prisma Client encontrados", {
        path: foundPath,
      });
    }
  }

  /**
   * Tenta regenerar o Prisma Client executando o comando prisma generate
   */
  private regeneratePrismaClient(): void {
    try {
      logger.info("Tentando regenerar o Prisma Client");
      execSync("npx prisma generate", { stdio: "inherit" });
      logger.info("Regeneração do Prisma Client concluída");
    } catch (error) {
      logger.error("Falha ao executar 'prisma generate'", {
        error: error instanceof Error ? error.message : String(error),
        command: "npx prisma generate",
      });
      throw new Error("Falha na regeneração do Prisma Client");
    }
  }

  /**
   * Obtém a instância única do gerenciador de banco de dados (Singleton)
   * @param options Opções de configuração do banco de dados
   * @returns Instância única da classe DatabaseManager
   */
  public static getInstance(options: DatabaseOptions = {}): DatabaseManager {
    if (!DatabaseManager.instance) {
      try {
        DatabaseManager.instance = new DatabaseManager(options);
      } catch (error) {
        logger.error("Erro fatal ao criar instância do DatabaseManager", error);
        throw error;
      }
    }
    return DatabaseManager.instance;
  }

  /**
   * Configura os níveis de log com base no ambiente
   * @returns Array de configurações de log para o Prisma
   */
  private getLogLevels(): any[] {
    // Define logs com base no ambiente e nas opções do usuário
    const levels: PrismaLogLevel[] = [...this.options.logLevels];

    // Em desenvolvimento, adiciona logs de consulta por padrão se não especificado
    if (env.isDevelopment && !levels.includes("query")) {
      levels.push("query");
    }

    // Sempre incluir erros em qualquer ambiente
    if (!levels.includes("error")) {
      levels.push("error");
    }

    // Formato simplificado compatível com diferentes versões do Prisma
    return levels.map((level) => ({ level, emit: "event" }));
  }

  /**
   * Registra callbacks para eventos de consulta
   * @param callbacks Objeto com callbacks para diferentes eventos
   */
  public onQueryEvents(callbacks: QueryEventCallbacks): void {
    this.queryEventCallbacks = { ...this.queryEventCallbacks, ...callbacks };

    logger.debug("Callbacks de eventos de consulta registrados");
  }

  /**
   * Registra callbacks para eventos do ciclo de vida do banco de dados
   * @param events Objeto com callbacks para diferentes eventos do ciclo de vida
   */
  public onLifecycleEvents(events: DatabaseLifecycleEvents): void {
    this.lifecycleEvents = { ...this.lifecycleEvents, ...events };
  }

  /**
   * Obtém o cliente Prisma para operações no banco de dados
   * @returns Cliente Prisma
   */
  public getClient(): any {
    return this.prisma;
  }

  /**
   * Conecta ao banco de dados com tratamento de erros e reconexão automática
   * @returns Promise que resolve quando a conexão é estabelecida
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    // Evita tentativas simultâneas de conexão
    if (this.isConnecting) {
      logger.debug("Conexão já em andamento, ignorando solicitação duplicada");
      return;
    }

    this.isConnecting = true;

    try {
      // Notifica evento antes da conexão
      if (this.lifecycleEvents.onBeforeConnect) {
        await this.lifecycleEvents.onBeforeConnect();
      }

      logger.info("Conectando ao banco de dados...");

      await this.prisma.$connect();

      this.isConnected = true;
      this.isConnecting = false;
      this.connectionAttempts = 0;
      this.metrics.connectionEstablishedAt = new Date();

      logger.info("Conexão com o banco de dados estabelecida com sucesso");

      // Verifica a versão do banco de dados para logging
      this.logDatabaseVersionInfo();

      // Notifica evento após conexão bem-sucedida
      if (this.lifecycleEvents.onConnect) {
        await this.lifecycleEvents.onConnect();
      }
    } catch (error) {
      this.isConnected = false;
      this.isConnecting = false;
      this.connectionAttempts++;
      this.metrics.reconnectAttempts++;
      this.metrics.lastReconnectAt = new Date();

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode = (error as any).code;

      logger.error(`Falha ao conectar ao banco de dados: ${errorMessage}`, {
        attempt: this.connectionAttempts,
        maxAttempts: this.options.reconnectAttempts,
        code: errorCode,
      });

      // Tenta reconectar se não excedeu o número máximo de tentativas
      if (this.connectionAttempts < this.options.reconnectAttempts) {
        const delay = this.calculateBackoff(this.connectionAttempts);

        logger.info(
          `Tentando reconectar em ${delay / 1000} segundos (tentativa ${
            this.connectionAttempts
          } de ${this.options.reconnectAttempts})`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));

        // Notifica evento de reconexão
        if (this.lifecycleEvents.onReconnect) {
          await this.lifecycleEvents.onReconnect(this.connectionAttempts);
        }

        return this.connect();
      } else {
        logger.error(
          `Número máximo de tentativas de reconexão atingido (${this.options.reconnectAttempts})`
        );
        throw new Error(
          `Falha na conexão com o banco de dados após ${this.options.reconnectAttempts} tentativas: ${errorMessage}`
        );
      }
    }
  }

  /**
   * Obtém e loga informações sobre a versão do banco de dados
   */
  private async logDatabaseVersionInfo(): Promise<void> {
    try {
      // Esta query funciona com PostgreSQL e MySQL, pode precisar ajustar para outros DBs
      const result = await this.prisma.$queryRaw`SELECT version();`;
      const versionInfo = Array.isArray(result) ? result[0] : result;
      logger.info("Versão do banco de dados", { version: versionInfo });
    } catch (error) {
      // Não interrompe se não conseguir verificar a versão
      logger.debug("Não foi possível verificar a versão do banco de dados", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Calcula o tempo de espera para reconexão usando backoff exponencial
   * @param attempt Número da tentativa atual
   * @returns Tempo de espera em milissegundos
   */
  private calculateBackoff(attempt: number): number {
    // Backoff exponencial com jitter para evitar tempestade de reconexões
    const baseDelay = this.options.reconnectInterval;
    const maxDelay = 60000; // 1 minuto
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(1.5, attempt - 1), // Usando 1.5 para crescimento mais suave
      maxDelay
    );

    const jitter = Math.random() * 0.3 * exponentialDelay;

    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Desconecta do banco de dados de forma segura
   * @returns Promise que resolve quando a desconexão é concluída
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      logger.info("Desconectando do banco de dados...");

      // Notifica evento antes da desconexão
      if (this.lifecycleEvents.onDisconnect) {
        await this.lifecycleEvents.onDisconnect();
      }

      await this.prisma.$disconnect();

      this.isConnected = false;
      logger.info("Desconectado do banco de dados com sucesso");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Erro ao desconectar do banco de dados: ${errorMessage}`);

      // Força a desconexão em caso de erro
      try {
        await this.prisma.$disconnect();
      } catch (e) {
        // Ignora erros ao forçar desconexão
      }

      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Executa uma operação no banco de dados dentro de uma transação
   * com timeout e retry automático para erros transitórios
   *
   * @param fn Função que contém as operações a serem executadas na transação
   * @param options Opções adicionais para a transação
   * @returns Promise com o resultado da função executada
   */
  public async transaction<T>(
    fn: (prisma: any) => Promise<T>,
    options: {
      timeout?: number; // Timeout em ms (padrão: 30000)
      maxRetries?: number; // Número máximo de retentativas (padrão: 3)
      retryDelay?: number; // Atraso inicial entre retentativas em ms (padrão: 200)
      isolationLevel?: TransactionIsolationLevel; // Nível de isolamento (se suportado)
    } = {}
  ): Promise<T> {
    const {
      timeout = 30000,
      maxRetries = 3,
      retryDelay = 200,
      isolationLevel,
    } = options;

    let attempt = 0;

    // Lista ampliada e categorizada de erros transitórios que podem ser retentados
    const retryableErrorCodes = {
      // Erros de conexão
      connection: [
        "P1001", // "Can't reach database server"
        "P1002", // "Database connection timed out"
        "P1003", // "Database does not exist at {database_file_path}"
        "P1010", // "User was denied access on the database"
        "P1011", // "Error opening a TLS connection"
        "P1017", // "Server closed the connection"
      ],

      // Erros de timeout
      timeout: [
        "P1008", // "Operations timed out"
        "P2024", // "Timed out fetching a new connection"
        "P2034", // "Transaction failed due to timeout"
      ],

      // Erros de concorrência
      concurrency: [
        "P2025", // "Record not found" (pode acontecer em condições de corrida)
        "P2026", // "The current database transaction cannot be aborted"
        "P2028", // "Transaction api error"
        "P2029", // "Concurrent write transaction failed"
        "P2034", // "Transaction failed due to timeout"
      ],

      // Erros de conexão de pool
      pool: [
        "P2021", // "The connection pool failed to establish a connection"
        "P2022", // "The connection pool was unable to connect to the database"
        "P2023", // "Inconsistent query result"
        "P2024", // "Timed out fetching a new connection from the connection pool"
      ],

      // Erros MySQL específicos
      mysql: [
        "40001", // Deadlock
        "1205", // Lock wait timeout
        "1213", // Deadlock
        "1040", // Too many connections
        "1053", // Server shutdown
        "2006", // MySQL server has gone away
        "2013", // Lost connection during query
      ],

      // Erros PostgreSQL específicos
      postgres: [
        "40001", // Serialization failure
        "40P01", // Deadlock detected
        "57014", // Query canceled
        "57P01", // Admin shutdown
        "57P02", // Crash shutdown
        "53300", // Too many connections
        "53400", // Configuration limit exceeded
        "08003", // Connection does not exist
        "08006", // Connection failure
        "08001", // Unable to connect
        "08004", // Rejected connection
      ],
    };

    // Função utilitária para verificar se um código de erro é retentável
    const isRetryableError = (code: string): boolean => {
      if (!code) return false;

      // Verificar em todas as categorias
      return Object.values(retryableErrorCodes).some((category) =>
        category.includes(code)
      );
    };

    // Função de retentativa com backoff exponencial
    const executeWithRetry = async (): Promise<T> => {
      attempt++;

      try {
        // Configura o timeout da transação
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Transação excedeu o timeout de ${timeout}ms`));
          }, timeout);
        });

        // Executa a transação com as opções configuradas
        const txOptions: any = {};
        if (isolationLevel) {
          txOptions.isolationLevel = isolationLevel;
        }

        // Usando versão simplificada para reduzir problemas de tipo
        const transactionPromise = this.prisma.$transaction(
          (prismaTransaction: any) => fn(prismaTransaction),
          txOptions
        );

        // Retorna o primeiro que resolver (transação ou timeout)
        const startTime = performance.now();
        const result = await Promise.race([transactionPromise, timeoutPromise]);
        const duration = Math.round(performance.now() - startTime);

        logger.debug(`Transação concluída com sucesso em ${duration}ms`);

        // Registra métrica de query bem-sucedida
        this.recordQueryMetric({
          query: "TRANSACTION",
          duration,
          success: true,
        });

        return result;
      } catch (error) {
        const errorObj = error as any;
        const errorCode = errorObj.code || "";
        const isRetryable = isRetryableError(errorCode);

        // Registra métrica de query falha
        this.recordQueryMetric({
          query: "TRANSACTION",
          duration: 0,
          success: false,
        });

        // Verifica se deve tentar novamente
        if (isRetryable && attempt < maxRetries) {
          const nextDelay = retryDelay * Math.pow(2, attempt - 1);
          logger.warn(
            `Erro retentável na transação: ${errorObj.message}. Tentando novamente em ${nextDelay}ms (tentativa ${attempt})`,
            {
              error: errorObj,
              code: errorCode,
              attempt,
              nextDelay,
            }
          );

          // Espera antes de tentar novamente
          await new Promise((resolve) => setTimeout(resolve, nextDelay));
          return executeWithRetry();
        }

        // Erro não retentável ou máximo de tentativas atingido
        logger.error(
          `Erro na transação (tentativa ${attempt}/${maxRetries}): ${errorObj.message}`,
          {
            code: errorCode,
            stack: errorObj.stack,
            retryable: isRetryable,
          }
        );

        throw error;
      }
    };

    return executeWithRetry();
  }

  /**
   * Verifica a saúde da conexão com o banco de dados
   * @returns Promise com objeto contendo status e informações detalhadas
   */
  public async healthCheck(): Promise<DatabaseHealthStatus> {
    const startTime = performance.now();

    try {
      if (!this.isConnected) {
        return {
          status: "error",
          responseTime: 0,
          error: {
            message: "Banco de dados não está conectado",
          },
        };
      }

      // Executa uma query simples para verificar a conexão
      await this.prisma.$queryRaw`SELECT 1`;

      const responseTime = Math.round(performance.now() - startTime);

      // Informações sobre o pool de conexões (aproximadas, pois não há API direta no Prisma)
      const connections = {
        current: 1, // Valor padrão quando não consegue obter o número real
        min: this.options.minConnections,
        max: this.options.maxConnections,
      };

      // Tenta obter informações adicionais para diferentes bancos
      let version: string | undefined;
      let additionalDetails: Record<string, any> = {};

      try {
        // Detecta tipo de banco para consultas específicas
        const databaseType = this.detectDatabaseType();

        switch (databaseType) {
          case "postgresql":
            const pgResult = await this.prisma.$queryRaw`
              SELECT version(), 
                     (SELECT count(*) FROM pg_stat_activity) as active_connections;
            `;
            if (Array.isArray(pgResult) && pgResult.length > 0) {
              version = pgResult[0].version;
              connections.current = parseInt(
                pgResult[0].active_connections,
                10
              );

              // Informações adicionais sobre o banco PostgreSQL
              const pgStats = await this.prisma.$queryRaw`
                SELECT sum(xact_commit) as commits, 
                       sum(xact_rollback) as rollbacks,
                       sum(blks_read) as disk_reads,
                       sum(blks_hit) as buffer_hits
                FROM pg_stat_database;
              `;
              if (Array.isArray(pgStats) && pgStats.length > 0) {
                additionalDetails = pgStats[0];
              }
            }
            break;

          case "mysql":
            const mysqlResult = await this.prisma.$queryRaw`
              SELECT VERSION() as version, 
                     (SELECT COUNT(*) FROM information_schema.processlist) as active_connections;
            `;
            if (Array.isArray(mysqlResult) && mysqlResult.length > 0) {
              version = mysqlResult[0].version;
              connections.current = parseInt(
                mysqlResult[0].active_connections,
                10
              );

              // Status global para MySQL
              const mysqlStats = await this.prisma.$queryRaw`
                SHOW GLOBAL STATUS WHERE Variable_name IN 
                ('Queries', 'Slow_queries', 'Threads_connected', 'Uptime');
              `;
              if (Array.isArray(mysqlStats)) {
                const statsMap: Record<string, any> = {};
                for (const row of mysqlStats) {
                  statsMap[row.Variable_name] = row.Value;
                }
                additionalDetails = statsMap;
              }
            }
            break;

          default:
            // Fallback genérico
            const genericResult = await this.prisma.$queryRaw`SELECT version()`;
            version = Array.isArray(genericResult)
              ? (genericResult[0] as any).version || String(genericResult[0])
              : String(genericResult);
        }
      } catch (e) {
        // Ignora erro ao tentar obter informações adicionais
        logger.debug("Não foi possível obter informações detalhadas do banco", {
          error: e instanceof Error ? e.message : String(e),
        });
      }

      return {
        status: "ok",
        responseTime,
        connections,
        version,
        details: {
          uptime: this.metrics.connectionEstablishedAt
            ? Math.floor(
                (new Date().getTime() -
                  this.metrics.connectionEstablishedAt.getTime()) /
                  1000
              )
            : 0,
          totalQueries: this.metrics.totalQueries,
          failedQueries: this.metrics.failedQueries,
          slowQueries: this.metrics.slowQueries,
          avgResponseTime: Math.round(this.metrics.avgResponseTime),
          reconnects: this.metrics.reconnectAttempts,
          lastReconnect: this.metrics.lastReconnectAt,
          ...additionalDetails,
        },
      };
    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode = (error as any).code;

      logger.error(`Falha no healthcheck do banco de dados: ${errorMessage}`, {
        code: errorCode,
      });

      return {
        status: "error",
        responseTime,
        error: {
          message: errorMessage,
          code: errorCode,
        },
      };
    }
  }

  /**
   * Tenta detectar o tipo de banco de dados com base na URL
   */
  private detectDatabaseType(): string {
    const url = env.databaseUrl.toLowerCase();
    if (url.includes("postgresql") || url.includes("postgres")) {
      return "postgresql";
    } else if (url.includes("mysql")) {
      return "mysql";
    } else if (url.includes("sqlite")) {
      return "sqlite";
    } else if (url.includes("sqlserver") || url.includes("mssql")) {
      return "sqlserver";
    }
    return "unknown";
  }

  /**
   * Limpa todas as tabelas do banco de dados (apenas para ambiente de teste)
   * @throws Erro se tentar executar em ambiente diferente de teste
   */
  public async clearDatabase(): Promise<void> {
    // Medida de segurança para evitar limpeza acidental em produção
    if (!env.isTest) {
      throw new Error(
        "A limpeza do banco de dados só é permitida em ambiente de teste"
      );
    }

    try {
      logger.warn(
        "Limpando todas as tabelas do banco de dados (ambiente de teste)"
      );

      // Detecta o tipo de banco para definir o método de limpeza
      const databaseType = this.detectDatabaseType();

      switch (databaseType) {
        case "postgresql":
          await this.clearPostgreSQLDatabase();
          break;
        case "mysql":
          await this.clearMySQLDatabase();
          break;
        case "sqlite":
          await this.clearSQLiteDatabase();
          break;
        default:
          throw new Error(
            `Método de limpeza não implementado para ${databaseType}`
          );
      }

      logger.warn("Banco de dados limpo com sucesso");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Erro ao limpar banco de dados: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Limpa banco PostgreSQL
   */
  private async clearPostgreSQLDatabase(): Promise<void> {
    // Desabilita checagem de chaves estrangeiras temporariamente
    await this.prisma.$executeRaw`SET session_replication_role = 'replica';`;

    // Obtém lista de tabelas
    const tables = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `;

    // Trunca cada tabela
    for (const { tablename } of tables) {
      if (tablename !== "_prisma_migrations") {
        await this.prisma
          .$executeRaw`TRUNCATE TABLE "public"."${tablename}" CASCADE;`;
      }
    }

    // Reabilita checagem de chaves estrangeiras
    await this.prisma.$executeRaw`SET session_replication_role = 'origin';`;
  }

  /**
   * Limpa banco MySQL
   */
  private async clearMySQLDatabase(): Promise<void> {
    // Desabilita checagem de chaves estrangeiras temporariamente
    await this.prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0;`;

    // Obtém lista de tabelas
    const tables = await this.prisma.$queryRaw<Array<{ TABLE_NAME: string }>>`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME != '_prisma_migrations';
    `;

    // Trunca cada tabela
    for (const { TABLE_NAME } of tables) {
      await this.prisma.$executeRaw`TRUNCATE TABLE \`${TABLE_NAME}\`;`;
    }

    // Reabilita checagem de chaves estrangeiras
    await this.prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1;`;
  }

  /**
   * Limpa banco SQLite
   */
  private async clearSQLiteDatabase(): Promise<void> {
    // Desabilita checagem de chaves estrangeiras temporariamente
    await this.prisma.$executeRaw`PRAGMA foreign_keys = OFF;`;

    // Obtém lista de tabelas
    const tables = await this.prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name != '_prisma_migrations' AND name != 'sqlite_sequence';
    `;

    // Trunca cada tabela
    for (const { name } of tables) {
      await this.prisma.$executeRaw`DELETE FROM "${name}";`;
    }

    // Reabilita checagem de chaves estrangeiras
    await this.prisma.$executeRaw`PRAGMA foreign_keys = ON;`;
  }

  /**
   * Obtém estatísticas e métricas sobre o uso do banco de dados
   * @returns Objeto com métricas coletadas
   */
  public getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Registra manualmente uma métrica de query (usado quando eventos não estão disponíveis)
   * @param queryInfo Informações sobre a query executada
   */
  public recordQueryMetric(queryInfo: {
    query: string;
    duration: number;
    success: boolean;
  }): void {
    this.metrics.totalQueries++;
    this.metrics.lastQuery = queryInfo.query;

    if (!queryInfo.success) {
      this.metrics.failedQueries++;
    }

    if (queryInfo.duration > 500) {
      this.metrics.slowQueries++;
    }

    this.metrics.responseTimeAccumulator += queryInfo.duration;
    this.metrics.avgResponseTime =
      this.metrics.responseTimeAccumulator / this.metrics.totalQueries;
  }
}

/**
 * Instância global do gerenciador de banco de dados
 */
export const db = DatabaseManager.getInstance();

/**
 * Cliente Prisma para uso direto quando necessário
 */
export const prisma = db.getClient();

/**
 * Função de utilitário para executar uma operação em transação
 * @param fn Função que contém as operações a serem executadas na transação
 * @param options Opções para a transação
 * @returns Promise com o resultado da função executada
 */
export async function withTransaction<T>(
  fn: (prisma: any) => Promise<T>,
  options?: Parameters<typeof db.transaction>[1]
): Promise<T> {
  return db.transaction(fn, options);
}

/**
 * Inicializa a conexão com o banco de dados na inicialização da aplicação
 * @returns Promise que resolve quando a inicialização é concluída
 */
export async function initDatabase(): Promise<void> {
  try {
    await db.connect();

    // Registra a função de limpeza para quando a aplicação for encerrada
    process.on("SIGINT", async () => {
      logger.info(
        "Sinal de interrupção recebido, fechando conexão com banco de dados"
      );
      await db.disconnect();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info(
        "Sinal de término recebido, fechando conexão com banco de dados"
      );
      await db.disconnect();
      process.exit(0);
    });

    // Executa healthcheck inicial
    const health = await db.healthCheck();
    if (health.status === "ok") {
      logger.info("Banco de dados verificado e saudável", {
        responseTime: `${health.responseTime}ms`,
        connections: health.connections,
        version: health.version,
      });
    }
  } catch (error) {
    logger.error("Falha ao inicializar o banco de dados", error);
    throw error;
  }
}
