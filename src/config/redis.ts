/**
 * Configuração do cliente Redis para cache e tarefas que exigem armazenamento em memória
 * Implementa o padrão Singleton para garantir uma única instância do cliente Redis
 */

import { createClient, RedisClientType } from "redis";
import { env } from "./environment";
import { logger } from "@/shared/utils/logger.utils";

/**
 * Classe Singleton para gerenciar a conexão com o Redis
 */
class RedisService {
  private static instance: RedisService;
  private _client: RedisClientType | null = null;
  private _isConnected: boolean = false;
  private _isConnecting: boolean = false;
  private _hasLoggedSuccess: boolean = false;

  /**
   * Construtor privado que inicializa a configuração do Redis
   */
  private constructor() {
    const url = this.getRedisUrl();

    // Se não tem URL configurada, não inicializa o cliente
    if (!url) {
      logger.debug(`Redis não configurado. Operando sem Redis.`);
      return;
    }

    logger.debug(
      `Inicializando cliente Redis com URL: ${this.getSafeUrl(url)}`
    );

    // Cria o cliente Redis com configurações adequadas para cada ambiente
    this._client = createClient({
      url,
      socket: {
        // Em desenvolvimento, sem reconexão automática
        // Em produção, reconexão limitada para evitar ciclos infinitos
        reconnectStrategy: env.isDevelopment
          ? false
          : (retries) => (retries > 5 ? 5000 : Math.min(retries * 500, 3000)),
        connectTimeout: 10000, // 10 segundos de timeout na conexão
      },
    });

    // Configuração de listeners para eventos do Redis
    this.setupEventListeners();
  }

  /**
   * Configura os listeners de eventos para o cliente Redis
   */
  private setupEventListeners(): void {
    if (!this._client) return;

    this._client.on("connect", () => {
      if (!this._hasLoggedSuccess) {
        logger.info("🔄 Redis: Iniciando conexão...");
      }
    });

    this._client.on("ready", () => {
      this._isConnected = true;
      if (!this._hasLoggedSuccess) {
        logger.info("✅ Redis: Conexão estabelecida com sucesso");
        this._hasLoggedSuccess = true;
      }
    });

    this._client.on("error", (err) => {
      // Log mais detalhado do erro
      if (!(env.isDevelopment && err.code === "ECONNREFUSED")) {
        logger.error("❌ Redis: Erro na conexão", {
          message: err.message,
          code: err.code,
          stack: err.stack,
        });
      } else {
        logger.warn(
          "⚠️ Redis: Não foi possível conectar em ambiente de desenvolvimento",
          {
            code: err.code,
          }
        );
      }
      this._isConnected = false;
    });

    this._client.on("end", () => {
      this._isConnected = false;
      this._hasLoggedSuccess = false;
      logger.info("🔌 Redis: Conexão encerrada");
    });

    // Adiciona listener para reconexões
    this._client.on("reconnecting", () => {
      logger.info("🔄 Redis: Tentando reconectar...");
    });
  }

  /**
   * Constrói a URL de conexão com o Redis baseada nas variáveis de ambiente
   * @returns URL formatada para conexão com o Redis ou null se não configurado
   */
  private getRedisUrl(): string | null {
    const { host, port, password } = env.redis;

    // Se não houver host configurado, retorna nulo
    if (!host) {
      return null;
    }

    const authPart = password ? `:${password}@` : "";
    return `redis://${authPart}${host}:${port}`;
  }

  /**
   * Retorna uma versão segura da URL (sem senha) para logs
   */
  private getSafeUrl(url: string | null): string {
    if (!url) return "none";
    return url.replace(/(:.*@)/, ":***@");
  }

  /**
   * Método estático para obter a instância única do RedisService
   * @returns Instância do RedisService
   */
  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Getter para acessar o cliente Redis
   * @returns Instância do cliente Redis
   */
  public get client(): RedisClientType | null {
    return this._client;
  }

  /**
   * Verifica se a conexão com o Redis está ativa
   * @returns Verdadeiro se conectado, falso caso contrário
   */
  public isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Método para conectar ao Redis
   * Deve ser chamado explicitamente durante a inicialização da aplicação
   */
  public async connect(): Promise<void> {
    // Evita múltiplas tentativas de conexão simultâneas
    if (this._isConnected || this._isConnecting || !this._client) {
      return;
    }

    // Se não tiver cliente criado, não tenta conectar
    if (!this._client) {
      logger.warn("⚠️ Redis: Cliente não inicializado. Operando sem Redis.");
      return;
    }

    this._isConnecting = true;

    try {
      logger.info("🔄 Redis: Tentando conectar...", {
        host: env.redis.host,
        port: env.redis.port,
      });

      // Tenta estabelecer a conexão
      await this._client.connect();

      // Se não lançou exceção, a conexão foi bem sucedida
      this._isConnected = true;
      logger.info("✅ Redis: Conexão estabelecida com sucesso");
    } catch (error) {
      this._isConnected = false;

      if (env.isDevelopment) {
        logger.warn(
          "⚠️ Redis: Continuando sem Redis em ambiente de desenvolvimento",
          { error: error instanceof Error ? error.message : String(error) }
        );
        logger.warn(
          "   Para habilitar o Redis, verifique se o serviço está rodando na porta 6379"
        );
      } else {
        logger.error("❌ Redis: Erro fatal ao conectar", error);
        throw error;
      }
    } finally {
      this._isConnecting = false;
    }
  }

  /**
   * Método para desconectar do Redis
   * Deve ser chamado quando a aplicação for encerrada
   */
  public async disconnect(): Promise<void> {
    if (this._isConnected && this._client) {
      try {
        await this._client.disconnect();
        this._isConnected = false;
        this._hasLoggedSuccess = false;
        logger.info("🔌 Redis: Conexão encerrada com sucesso");
      } catch (error) {
        logger.error("❌ Redis: Erro ao desconectar", error);
        throw error;
      }
    }
  }

  /**
   * Armazena um valor no Redis com uma chave especificada
   * @param key Chave para identificar o valor
   * @param value Valor a ser armazenado
   * @param expireInSeconds Tempo de expiração em segundos (opcional)
   */
  public async set(
    key: string,
    value: string,
    expireInSeconds?: number
  ): Promise<void> {
    if (!this._isConnected || !this._client) {
      if (env.isDevelopment) {
        logger.debug(
          `Redis não conectado: SET ${key} (ignorado em desenvolvimento)`
        );
        return; // Silenciosamente não faz nada em desenvolvimento
      }
      throw new Error("Redis não está conectado");
    }

    try {
      if (expireInSeconds) {
        await this._client.set(key, value, { EX: expireInSeconds });
        logger.debug(`Redis: SET ${key} (expira em ${expireInSeconds}s)`);
      } else {
        await this._client.set(key, value);
        logger.debug(`Redis: SET ${key}`);
      }
    } catch (error) {
      this.handleOperationError("set", error);
    }
  }

  /**
   * Recupera um valor do Redis pela chave
   * @param key Chave do valor a ser recuperado
   * @returns Valor armazenado ou null se não existir
   */
  public async get(key: string): Promise<string | null> {
    if (!this._isConnected || !this._client) {
      if (env.isDevelopment) {
        logger.debug(
          `Redis não conectado: GET ${key} (ignorado em desenvolvimento)`
        );
        return null; // Silenciosamente retorna null em desenvolvimento
      }
      throw new Error("Redis não está conectado");
    }

    try {
      const value = await this._client.get(key);
      logger.debug(
        `Redis: GET ${key} ${value ? "(encontrado)" : "(não encontrado)"}`
      );
      return value;
    } catch (error) {
      return this.handleOperationError("get", error);
    }
  }

  /**
   * Remove um valor do Redis pela chave
   * @param key Chave do valor a ser removido
   */
  public async delete(key: string): Promise<void> {
    if (!this._isConnected || !this._client) {
      if (env.isDevelopment) {
        logger.debug(
          `Redis não conectado: DEL ${key} (ignorado em desenvolvimento)`
        );
        return; // Silenciosamente não faz nada em desenvolvimento
      }
      throw new Error("Redis não está conectado");
    }

    try {
      await this._client.del(key);
      logger.debug(`Redis: DEL ${key}`);
    } catch (error) {
      this.handleOperationError("delete", error);
    }
  }

  /**
   * Verifica se uma chave existe no Redis
   * @param key Chave a ser verificada
   * @returns Verdadeiro se existir, falso caso contrário
   */
  public async exists(key: string): Promise<boolean> {
    if (!this._isConnected || !this._client) {
      if (env.isDevelopment) {
        logger.debug(
          `Redis não conectado: EXISTS ${key} (ignorado em desenvolvimento)`
        );
        return false; // Silenciosamente retorna false em desenvolvimento
      }
      throw new Error("Redis não está conectado");
    }

    try {
      const result = await this._client.exists(key);
      logger.debug(`Redis: EXISTS ${key} (${result === 1 ? "sim" : "não"})`);
      return result === 1;
    } catch (error) {
      return this.handleOperationError("exists", error);
    }
  }

  /**
   * Manipula erros de operações do Redis de forma consistente
   * @param operation Nome da operação que falhou
   * @param error Erro que ocorreu
   * @returns Valor padrão para o tipo de operação em ambiente de desenvolvimento
   * @throws Erro em ambiente de produção
   */
  private handleOperationError<T>(operation: string, error: unknown): T {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Erro na operação ${operation} do Redis:`, {
      error: errorMessage,
    });

    if (env.isDevelopment) {
      // Em desenvolvimento, retornamos valores padrão seguros
      switch (operation) {
        case "get":
          return null as T;
        case "exists":
          return false as T;
        default:
          return undefined as T;
      }
    }

    // Em produção, propagamos o erro
    throw error;
  }
}

// Exporta uma instância única do serviço Redis
export const redisService = RedisService.getInstance();
