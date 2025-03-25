/**
 * Configuração do cliente Redis para cache e tarefas que exigem armazenamento em memória
 * Implementa o padrão Singleton para garantir uma única instância do cliente Redis
 */

import { createClient, RedisClientType } from "redis";
import { env } from "./environment";
import { logInfo, logError, logWarn } from "./logger";

/**
 * Classe Singleton para gerenciar a conexão com o Redis
 */
class RedisService {
  private static instance: RedisService;
  private _client: RedisClientType;
  private _isConnected: boolean = false;
  private _isConnecting: boolean = false;
  private _hasLoggedSuccess: boolean = false;

  /**
   * Construtor privado que inicializa a configuração do Redis
   */
  private constructor() {
    const url = this.getRedisUrl();

    // Cria o cliente Redis com configurações adequadas para cada ambiente
    this._client = createClient({
      url,
      socket: {
        // Em desenvolvimento, sem reconexão automática
        // Em produção, reconexão limitada para evitar ciclos infinitos
        reconnectStrategy: env.isDevelopment
          ? false
          : (retries) => (retries > 5 ? 5000 : Math.min(retries * 500, 3000)),
      },
    });

    // Configuração de listeners para eventos do Redis
    this.setupEventListeners();
  }

  /**
   * Configura os listeners de eventos para o cliente Redis
   */
  private setupEventListeners(): void {
    this._client.on("connect", () => {
      if (!this._hasLoggedSuccess) {
        logInfo("🔄 Redis: Tentando conectar...");
      }
    });

    this._client.on("ready", () => {
      this._isConnected = true;
      if (!this._hasLoggedSuccess) {
        logInfo("✅ Redis: Conexão estabelecida com sucesso");
        this._hasLoggedSuccess = true;
      }
    });

    this._client.on("error", (err) => {
      // Só registra como erro se não for erro de conexão em desenvolvimento
      if (!(env.isDevelopment && err.code === "ECONNREFUSED")) {
        logError("❌ Redis: Erro na conexão", err);
      }
      this._isConnected = false;
    });

    this._client.on("end", () => {
      this._isConnected = false;
      this._hasLoggedSuccess = false;
      logInfo("🔌 Redis: Conexão encerrada");
    });
  }

  /**
   * Constrói a URL de conexão com o Redis baseada nas variáveis de ambiente
   * @returns URL formatada para conexão com o Redis
   */
  private getRedisUrl(): string {
    const { host, port, password } = env.redis;
    const authPart = password ? `:${password}@` : "";
    return `redis://${authPart}${host}:${port}`;
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
  public get client(): RedisClientType {
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
    if (this._isConnected || this._isConnecting) {
      return;
    }

    this._isConnecting = true;

    try {
      if (env.isDevelopment) {
        // Em desenvolvimento, tentamos conectar com timeout
        await this.connectWithTimeout(2000);
      } else {
        // Em produção, tentamos conectar normalmente
        await this._client.connect();
      }
    } catch (error) {
      if (env.isDevelopment) {
        logWarn(
          "⚠️ Redis: Continuando sem Redis em ambiente de desenvolvimento"
        );
        logWarn(
          "   Para habilitar o Redis, inicie um servidor Redis local na porta 6379"
        );
      } else {
        throw error;
      }
    } finally {
      this._isConnecting = false;
    }
  }

  /**
   * Tenta conectar ao Redis com um timeout
   * @param timeoutMs Tempo máximo para tentativa de conexão em milissegundos
   */
  private async connectWithTimeout(timeoutMs: number): Promise<void> {
    const connectPromise = this._client.connect();
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Timeout ao conectar com Redis"));
      }, timeoutMs);
    });

    // Usar Promise.race para limitar o tempo de espera
    await Promise.race([connectPromise, timeoutPromise]);
  }

  /**
   * Método para desconectar do Redis
   * Deve ser chamado quando a aplicação for encerrada
   */
  public async disconnect(): Promise<void> {
    if (this._isConnected) {
      await this._client.disconnect();
      this._isConnected = false;
      this._hasLoggedSuccess = false;
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
    if (!this._isConnected) {
      if (env.isDevelopment) {
        return; // Silenciosamente não faz nada em desenvolvimento
      }
      throw new Error("Redis não está conectado");
    }

    try {
      if (expireInSeconds) {
        await this._client.set(key, value, { EX: expireInSeconds });
      } else {
        await this._client.set(key, value);
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
    if (!this._isConnected) {
      if (env.isDevelopment) {
        return null; // Silenciosamente retorna null em desenvolvimento
      }
      throw new Error("Redis não está conectado");
    }

    try {
      return await this._client.get(key);
    } catch (error) {
      return this.handleOperationError("get", error);
    }
  }

  /**
   * Remove um valor do Redis pela chave
   * @param key Chave do valor a ser removido
   */
  public async delete(key: string): Promise<void> {
    if (!this._isConnected) {
      if (env.isDevelopment) {
        return; // Silenciosamente não faz nada em desenvolvimento
      }
      throw new Error("Redis não está conectado");
    }

    try {
      await this._client.del(key);
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
    if (!this._isConnected) {
      if (env.isDevelopment) {
        return false; // Silenciosamente retorna false em desenvolvimento
      }
      throw new Error("Redis não está conectado");
    }

    try {
      const result = await this._client.exists(key);
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
  private handleOperationError<T>(operation: string, error: any): T {
    logError(`Erro na operação ${operation} do Redis:`, error);

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
