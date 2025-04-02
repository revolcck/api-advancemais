import { PrismaClient } from "@prisma/client";
import { SeedContext } from "./types";
import { logger } from "./logger";

/**
 * Classe para gerenciar seeds e dependências de forma centralizada
 */
export class SeedManager {
  private context: SeedContext;
  private prisma: PrismaClient;
  private seedsExecuted: Set<string> = new Set();

  /**
   * Cria uma nova instância do SeedManager
   * @param prisma Instância do PrismaClient
   * @param initialContext Contexto inicial (opcional)
   */
  constructor(prisma: PrismaClient, initialContext: SeedContext = {}) {
    this.prisma = prisma;
    this.context = { ...initialContext };
  }

  /**
   * Registra uma função seed junto com suas dependências
   * @param name Nome do seed
   * @param fn Função seed
   * @param dependencies Lista de nomes de seeds que devem ser executados antes
   * @returns O próprio SeedManager para encadeamento
   */
  registerSeed(
    name: string,
    fn: (ctx: SeedContext) => Promise<SeedContext>,
    dependencies: string[] = []
  ): SeedManager {
    this.context[`seed_${name}`] = {
      name,
      fn,
      dependencies,
      executed: false,
    };
    return this;
  }

  /**
   * Verifica e executa dependências de um seed
   * @param name Nome do seed
   * @private
   */
  private async executeDependencies(name: string): Promise<void> {
    const seed = this.context[`seed_${name}`];
    if (!seed) {
      throw new Error(`Seed "${name}" não registrado`);
    }

    for (const dep of seed.dependencies) {
      if (!this.seedsExecuted.has(dep)) {
        logger.info(`Executando dependência: ${dep} para ${name}`);
        await this.executeSeed(dep);
      }
    }
  }

  /**
   * Executa um seed específico e suas dependências
   * @param name Nome do seed
   * @returns Contexto atualizado após execução
   */
  async executeSeed(name: string): Promise<SeedContext> {
    // Verifica se já foi executado
    if (this.seedsExecuted.has(name)) {
      logger.info(`Seed "${name}" já foi executado, pulando...`);
      return this.context;
    }

    const seed = this.context[`seed_${name}`];
    if (!seed) {
      throw new Error(`Seed "${name}" não registrado`);
    }

    try {
      // Executa dependências primeiro
      await this.executeDependencies(name);

      // Executa o seed
      logger.info(`Iniciando seed: ${name}`);
      const startTime = Date.now();

      const updatedContext = await seed.fn(this.context);

      // Atualiza o contexto
      this.context = { ...this.context, ...updatedContext };

      // Marca como executado
      this.seedsExecuted.add(name);
      seed.executed = true;

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.success(`Seed "${name}" concluído em ${duration}s`);

      return this.context;
    } catch (error) {
      logger.error(`Erro ao executar seed "${name}":`, error);
      throw error;
    }
  }

  /**
   * Executa todos os seeds registrados na ordem correta
   * @returns Contexto final após execução de todos os seeds
   */
  async executeAll(): Promise<SeedContext> {
    logger.info("Iniciando execução de todos os seeds...");
    const startTime = Date.now();

    const seedNames = Object.keys(this.context)
      .filter((key) => key.startsWith("seed_"))
      .map((key) => key.replace("seed_", ""));

    for (const name of seedNames) {
      if (!this.seedsExecuted.has(name)) {
        await this.executeSeed(name);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.success(`Todos os seeds executados com sucesso em ${duration}s`);

    return this.context;
  }

  /**
   * Verifica se há requisitos necessários no contexto
   * @param requirements Lista de chaves que devem existir no contexto
   * @param seedName Nome do seed para mensagem de erro
   * @throws Erro se algum requisito não for encontrado
   */
  verifyContextRequirements(
    requirements: (keyof SeedContext)[],
    seedName: string
  ): void {
    const missingRequirements = requirements.filter(
      (req) => !this.context[req]
    );

    if (missingRequirements.length > 0) {
      throw new Error(
        `Requisitos não encontrados no contexto para ${seedName}: ${missingRequirements.join(
          ", "
        )}. 
        Execute os seeds correspondentes antes.`
      );
    }
  }

  /**
   * Obtém o contexto atual
   */
  getContext(): SeedContext {
    return { ...this.context };
  }

  /**
   * Obtém a instância do PrismaClient
   */
  getPrisma(): PrismaClient {
    return this.prisma;
  }

  /**
   * Desconecta o PrismaClient
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  /**
   * Cria um novo SeedManager com a mesma configuração
   */
  createClone(): SeedManager {
    return new SeedManager(this.prisma, this.context);
  }
}

// Instância singleton do SeedManager
export const seedManager = new SeedManager(new PrismaClient());
