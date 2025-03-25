import { createClient, RedisClientType } from "redis";
import { env } from "./environment";

/**
 * Classe Singleton para gerenciar a conexão com o Redis
 */
class RedisService {
  private static instance: RedisService;
  private _client: RedisClientType;
  private _isConnected: boolean = false;

  /**
   * Construtor privado que inicializa a conexão com o Redis
   */
  private constructor() {
    // Configuração do cliente Redis baseada nas variáveis de ambiente
    const url = this.getRedisUrl();

    this._client = createClient({
      url,
    });

    // Configuração de listeners para eventos do Redis
    this._client.on("connect", () => {
      console.log("🔄 Redis: Tentando conectar...");
    });

    this._client.on("ready", () => {
      this._isConnected = true;
      console.log("✅ Redis: Conexão estabelecida com sucesso");
    });

    this._client.on("error", (err) => {
      this._isConnected = false;
      console.error("❌ Redis: Erro na conexão", err);
    });

    this._client.on("end", () => {
      this._isConnected = false;
      console.log("🔌 Redis: Conexão encerrada");
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
    if (!this._isConnected) {
      try {
        await this._client.connect();
      } catch (error) {
        console.error("❌ Redis: Falha ao conectar", error);
        throw error;
      }
    }
  }

  /**
   * Método para desconectar do Redis
   * Deve ser chamado quando a aplicação for encerrada
   */
  public async disconnect(): Promise<void> {
    if (this._isConnected) {
      await this._client.disconnect();
      this._isConnected = false;
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
    if (expireInSeconds) {
      await this._client.set(key, value, { EX: expireInSeconds });
    } else {
      await this._client.set(key, value);
    }
  }

  /**
   * Recupera um valor do Redis pela chave
   * @param key Chave do valor a ser recuperado
   * @returns Valor armazenado ou null se não existir
   */
  public async get(key: string): Promise<string | null> {
    return await this._client.get(key);
  }

  /**
   * Remove um valor do Redis pela chave
   * @param key Chave do valor a ser removido
   */
  public async delete(key: string): Promise<void> {
    await this._client.del(key);
  }

  /**
   * Verifica se uma chave existe no Redis
   * @param key Chave a ser verificada
   * @returns Verdadeiro se existir, falso caso contrário
   */
  public async exists(key: string): Promise<boolean> {
    const result = await this._client.exists(key);
    return result === 1;
  }
}

// Exporta uma instância única do serviço Redis
export const redisService = RedisService.getInstance();
