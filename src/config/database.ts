/**
 * Configuração e gerenciamento do banco de dados usando Prisma
 * Versão minimalista e direta
 */
import { PrismaClient } from "@prisma/client";
import { env } from "./environment";
import { logger } from "@/shared/utils/logger.utils";

/**
 * Interface para resultados de verificação de saúde
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
}

/**
 * Classe DatabaseManager - versão simplificada
 */
export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private prisma: PrismaClient;
  private isConnected: boolean = false;

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {
    this.prisma = new PrismaClient({
      log: env.isDevelopment ? ["query", "error", "warn"] : ["error"],
    });

    logger.debug("Cliente Prisma inicializado");
  }

  /**
   * Obtém a instância única do gerenciador de banco de dados
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Obtém o cliente Prisma para operações no banco de dados
   */
  public getClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Conecta ao banco de dados
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      logger.info("Conectando ao banco de dados...");
      await this.prisma.$connect();
      this.isConnected = true;
      logger.info("Conexão com o banco de dados estabelecida com sucesso");
    } catch (error) {
      this.isConnected = false;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Falha ao conectar ao banco de dados: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Desconecta do banco de dados
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      logger.info("Desconectado do banco de dados");
    } catch (error) {
      logger.error("Erro ao desconectar do banco de dados", error);
    }
  }

  /**
   * Verifica a saúde da conexão com o banco de dados
   */
  public async healthCheck(): Promise<DatabaseHealthStatus> {
    const startTime = performance.now();

    try {
      if (!this.isConnected) {
        return {
          status: "error",
          responseTime: 0,
          error: { message: "Banco de dados não está conectado" },
        };
      }

      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Math.round(performance.now() - startTime);

      return {
        status: "ok",
        responseTime,
        connections: {
          current: 1,
          min: env.databasePoolMin,
          max: env.databasePoolMax,
        },
      };
    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime);
      return {
        status: "error",
        responseTime,
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Executa uma transação
   * Corrigido para usar a assinatura correta do $transaction
   */
  public async transaction<T>(
    fn: (
      prisma: Omit<
        PrismaClient,
        | "$connect"
        | "$disconnect"
        | "$on"
        | "$transaction"
        | "$use"
        | "$extends"
      >
    ) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}

// Instância global do gerenciador de banco de dados
export const db = DatabaseManager.getInstance();

// Cliente Prisma para uso direto
export const prisma = db.getClient();

// Inicializa a conexão com o banco de dados
export async function initDatabase(): Promise<void> {
  try {
    await db.connect();

    // Configuração para encerramento gracioso
    process.on("SIGINT", async () => {
      await db.disconnect();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      await db.disconnect();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Falha ao inicializar o banco de dados", error);
    throw error;
  }
}
