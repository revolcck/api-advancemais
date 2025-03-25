import { PrismaClient } from "@prisma/client";
import { env } from "./environment";

/**
 * Opções de log baseadas no ambiente
 * Em desenvolvimento, habilitamos logs mais detalhados para facilitar o debug
 */
const logLevels = env.isDevelopment
  ? (["query", "info", "warn", "error"] as const)
  : (["warn", "error"] as const);

/**
 * Classe Singleton para gerenciar a conexão com o banco de dados via Prisma
 */
class Database {
  private static instance: Database;
  private _prisma: PrismaClient;

  /**
   * Construtor privado que inicializa a conexão com o banco de dados
   */
  private constructor() {
    this._prisma = new PrismaClient({
      log: [...logLevels],
    });
  }

  /**
   * Método estático para obter a instância única do Database
   * @returns Instância do Database
   */
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Getter para acessar o cliente Prisma
   * @returns Instância do PrismaClient
   */
  public get prisma(): PrismaClient {
    return this._prisma;
  }

  /**
   * Método para conectar ao banco de dados
   * Útil para verificar a conexão durante a inicialização da aplicação
   */
  public async connect(): Promise<void> {
    try {
      await this._prisma.$connect();
      console.log("✅ Conexão com banco de dados estabelecida com sucesso");
    } catch (error) {
      console.error("❌ Erro ao conectar ao banco de dados:", error);
      throw error;
    }
  }

  /**
   * Método para desconectar do banco de dados
   * Deve ser chamado quando a aplicação for encerrada
   */
  public async disconnect(): Promise<void> {
    await this._prisma.$disconnect();
    console.log("🔌 Conexão com banco de dados fechada");
  }
}

// Exporta uma instância única do cliente Prisma
export const db = Database.getInstance();
export const prisma = db.prisma;
