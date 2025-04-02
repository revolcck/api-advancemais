// prisma/seeds/utils/SeedManager.ts
import { PrismaClient } from "@prisma/client";
import { SeedContext, SeedFunction } from "./types";
import { logger } from "./logger";

/**
 * Gerenciador de seeds com implementação simplificada e robusta
 */
export class SeedManager {
  private context: SeedContext;
  private prisma: PrismaClient;
  private seeds: Map<
    string,
    {
      fn: SeedFunction;
      dependencies: string[];
      executed: boolean;
    }
  > = new Map();
  private seedsExecuted: Set<string> = new Set();
  private seedsInProgress: Set<string> = new Set(); // Para detecção de dependências circulares

  /**
   * Cria uma nova instância do SeedManager
   */
  constructor(prisma: PrismaClient, initialContext: SeedContext = {}) {
    this.prisma = prisma;
    this.context = { ...initialContext };
  }

  /**
   * Registra uma função seed junto com suas dependências
   */
  registerSeed(
    name: string,
    fn: SeedFunction,
    dependencies: string[] = []
  ): SeedManager {
    this.seeds.set(name, {
      fn,
      dependencies,
      executed: false,
    });

    return this;
  }

  /**
   * Executa um seed específico e suas dependências
   */
  async executeSeed(name: string): Promise<SeedContext> {
    // Verificar se o seed está registrado
    if (!this.seeds.has(name)) {
      throw new Error(`Seed "${name}" não está registrado`);
    }

    // Verificar se o seed já foi executado
    if (this.seedsExecuted.has(name)) {
      logger.info(`Seed "${name}" já foi executado`);
      return this.context;
    }

    // Verificar dependências circulares
    if (this.seedsInProgress.has(name)) {
      throw new Error(`Dependência circular detectada para seed "${name}"`);
    }

    this.seedsInProgress.add(name);
    const seed = this.seeds.get(name)!;

    try {
      // Executar dependências primeiro
      for (const dep of seed.dependencies) {
        if (!this.seedsExecuted.has(dep)) {
          logger.info(`Executando dependência: ${dep} para ${name}`);
          await this.executeSeed(dep);
        }
      }

      // Executar o seed
      logger.info(`Iniciando seed: ${name}`);
      const startTime = Date.now();

      const updatedContext = await seed.fn(this.context);

      // Atualizar o contexto
      this.context = { ...this.context, ...updatedContext };

      // Marcar como executado
      this.seedsExecuted.add(name);
      seed.executed = true;
      this.seedsInProgress.delete(name);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.success(`Seed "${name}" concluído em ${duration}s`);

      return this.context;
    } catch (error) {
      // Em caso de erro, remover do set de seeds em progresso
      this.seedsInProgress.delete(name);
      logger.error(`Erro ao executar seed "${name}":`, error);
      throw error;
    }
  }

  /**
   * Executa todos os seeds registrados na ordem correta
   */
  async executeAll(): Promise<SeedContext> {
    logger.info("Iniciando execução de todos os seeds...");
    const startTime = Date.now();

    // Primeiro executar seeds sem dependências, depois os com dependências
    const seedNames = Array.from(this.seeds.keys());
    const independentSeeds = seedNames.filter(
      (name) => this.seeds.get(name)!.dependencies.length === 0
    );
    const dependentSeeds = seedNames.filter(
      (name) => this.seeds.get(name)!.dependencies.length > 0
    );

    // Executar seeds independentes primeiro
    for (const name of independentSeeds) {
      if (!this.seedsExecuted.has(name)) {
        await this.executeSeed(name);
      }
    }

    // Depois executar seeds com dependências
    for (const name of dependentSeeds) {
      if (!this.seedsExecuted.has(name)) {
        await this.executeSeed(name);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const totalExecuted = this.seedsExecuted.size;
    logger.success(
      `${totalExecuted} seeds executados com sucesso em ${duration}s`
    );

    return this.context;
  }

  /**
   * Verifica se há requisitos necessários no contexto
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
        )}. Execute os seeds dependentes primeiro.`
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
}

// Instância singleton do SeedManager
export const seedManager = new SeedManager(new PrismaClient());
