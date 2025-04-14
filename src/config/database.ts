import { PrismaClient, Prisma } from "@prisma/client";
import { env } from "./environment";
import { logger } from "@/shared/utils/logger.utils";

/**
 * Tipos de eventos de log do Prisma
 */
type PrismaLogLevel = "query" | "info" | "warn" | "error";

/**
 * Opções de configuração para o cliente de banco de dados
 */
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

/**
 * Eventos de consulta do Prisma para métricas e telemetria
 */
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

/**
 * Eventos do ciclo de vida do banco de dados
 */
interface DatabaseLifecycleEvents {
  onBeforeConnect?: () => Promise<void>;
  onConnect?: () => Promise<void>;
  onDisconnect?: () => Promise<void>;
  onReconnect?: (attempt: number) => Promise<void>;
}

/**
 * Resultados da verificação de saúde do banco de dados
 */
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
  private prisma: PrismaClient;
  private isConnected: boolean = false;
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
  };

  /**
   * Valores padrão para as opções de configuração
   */
  private readonly defaultOptions: Required<DatabaseOptions> = {
    logLevels: ["error", "warn"],
    maxConnections: env.databasePoolMax,
    minConnections: env.databasePoolMin,
    connectionTimeout: 30000, // 30 segundos
    reconnectAttempts: 5,
    reconnectInterval: 5000, // 5 segundos
    enableExtensions: true,
    enableQueryEvents: false, // Desabilitado por padrão devido a compatibilidade
  };

  /**
   * Opções atuais de configuração
   */
  private readonly options: Required<DatabaseOptions>;

  /**
   * Construtor privado para implementar o padrão Singleton
   * @param options Opções de configuração do banco de dados
   */
  private constructor(options: DatabaseOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };

    // Configura os níveis de log com base no ambiente
    const logLevels = this.getLogLevels();

    // Inicializa o cliente Prisma com as configurações
    this.prisma = new PrismaClient({
      log: logLevels,
      datasources: {
        db: {
          url: env.databaseUrl,
        },
      },
    });

    // Em versões específicas do Prisma, a configuração do pool pode ser feita de outras formas
    // Por exemplo, alguns usam variáveis de ambiente como DATABASE_CONNECTION_LIMIT

    // Comentado o código problemático de eventos do Prisma
    // Se os eventos forem necessários, será necessário verificar a documentação
    // específica da versão do Prisma para a forma correta de implementação

    logger.info("Gerenciador de banco de dados inicializado", {
      poolSize: `${this.options.minConnections}-${this.options.maxConnections}`,
      logLevels: this.options.logLevels,
      reconnectAttempts: this.options.reconnectAttempts,
    });
  }

  /**
   * Obtém a instância única do gerenciador de banco de dados (Singleton)
   * @param options Opções de configuração do banco de dados
   * @returns Instância única da classe DatabaseManager
   */
  public static getInstance(options: DatabaseOptions = {}): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager(options);
    }
    return DatabaseManager.instance;
  }

  /**
   * Configura os níveis de log com base no ambiente
   * @returns Array de configurações de log para o Prisma
   */
  private getLogLevels(): any[] {
    // Define logs com base no ambiente e nas opções do usuário
    const levels: PrismaLogLevel[] = this.options.logLevels || [];

    // Em desenvolvimento, adiciona logs de consulta por padrão se não especificado
    if (env.isDevelopment && !this.options.logLevels) {
      levels.push("query");
    }

    // Sempre incluir erros em qualquer ambiente
    if (!levels.includes("error")) {
      levels.push("error");
    }

    // Formato simplificado compatível com diferentes versões do Prisma
    return levels;
  }

  /**
   * Registra callbacks para eventos de consulta
   * @param callbacks Objeto com callbacks para diferentes eventos
   */
  public onQueryEvents(callbacks: QueryEventCallbacks): void {
    this.queryEventCallbacks = { ...this.queryEventCallbacks, ...callbacks };
    // Nota: A implementação real dos eventos depende da versão do Prisma
    // e pode precisar ser ajustada
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
  public getClient(): PrismaClient {
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

    try {
      // Notifica evento antes da conexão
      if (this.lifecycleEvents.onBeforeConnect) {
        await this.lifecycleEvents.onBeforeConnect();
      }

      logger.info("Conectando ao banco de dados...");

      await this.prisma.$connect();

      this.isConnected = true;
      this.connectionAttempts = 0;
      this.metrics.connectionEstablishedAt = new Date();

      logger.info("Conexão com o banco de dados estabelecida com sucesso");

      // Verifica a versão do banco de dados para logging
      try {
        // Esta query funciona com PostgreSQL e MySQL, pode precisar ajustar para outros DBs
        const result = await this.prisma.$queryRaw`SELECT version();`;
        const versionInfo = Array.isArray(result) ? result[0] : result;
        logger.info("Versão do banco de dados", { version: versionInfo });
      } catch (error) {
        // Não interrompe se não conseguir verificar a versão
        logger.debug("Não foi possível verificar a versão do banco de dados");
      }

      // Notifica evento após conexão bem-sucedida
      if (this.lifecycleEvents.onConnect) {
        await this.lifecycleEvents.onConnect();
      }
    } catch (error) {
      this.isConnected = false;
      this.connectionAttempts++;

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
   * Calcula o tempo de espera para reconexão usando backoff exponencial
   * @param attempt Número da tentativa atual
   * @returns Tempo de espera em milissegundos
   */
  private calculateBackoff(attempt: number): number {
    // Backoff exponencial com jitter para evitar tempestade de reconexões
    const baseDelay = this.options.reconnectInterval;
    const maxDelay = 60000; // 1 minuto
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, attempt - 1),
      maxDelay
    );

    // Adiciona jitter (variação aleatória) para evitar que múltiplas instâncias tentem
    // reconectar ao mesmo tempo após uma falha
    const jitter = Math.random() * 0.3 * exponentialDelay;

    return exponentialDelay + jitter;
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
   * @param fn Função que contém as operações a serem executadas na transação
   * @returns Promise com o resultado da função executada
   */
  public async transaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    try {
      logger.debug("Iniciando transação");

      const startTime = performance.now();
      const result = await this.prisma.$transaction(
        async (prismaTransaction: Prisma.TransactionClient) => {
          return await fn(prismaTransaction as PrismaClient);
        }
      );

      const duration = Math.round(performance.now() - startTime);

      logger.debug(`Transação concluída com sucesso em ${duration}ms`);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode = (error as any).code;

      logger.error(`Erro na transação: ${errorMessage}`, {
        code: errorCode,
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
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

      // Informações sobre o pool de conexões
      const connections = {
        current: 1, // Valor padrão quando não consegue obter o número real
        min: this.options.minConnections,
        max: this.options.maxConnections,
      };

      // Tenta obter a versão do banco de dados
      let version = undefined;
      try {
        const versionResult = await this.prisma.$queryRaw`SELECT version()`;
        version = Array.isArray(versionResult)
          ? (versionResult[0] as any).version || String(versionResult[0])
          : String(versionResult);
      } catch (e) {
        // Ignora erro ao tentar obter a versão
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

      // Método para limpar o banco varia de acordo com o tipo de banco
      // Esta implementação assume PostgreSQL, ajuste conforme necessário

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

      logger.warn("Banco de dados limpo com sucesso");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Erro ao limpar banco de dados: ${errorMessage}`);
      throw error;
    }
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
 * @returns Promise com o resultado da função executada
 */
export async function withTransaction<T>(
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  return db.transaction(fn);
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
