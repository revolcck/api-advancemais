// prisma/seeds/utils/index.ts
import { PrismaClient } from "@prisma/client";
import { SeedContext, UpsertOptions } from "./types";
import { logger } from "./logger";
import { seedManager } from "./SeedManager";
import { StringUtils } from "./StringUtils";
import { CodeGenerator } from "./CodeGenerator";

// Singleton do Prisma para usar em todos os seeds
export const prisma = seedManager.getPrisma();

// Re-exportações
export * from "./types";
export * from "./logger";
export * from "./SeedManager";
export * from "./StringUtils";
export * from "./CodeGenerator";

/**
 * Executa um seed com tratamento de erros padronizado
 */
export async function executeSeed(
  seedName: string,
  seedFn: (ctx: SeedContext) => Promise<SeedContext>,
  context: SeedContext
): Promise<SeedContext> {
  logger.subSection(`Executando seed: ${seedName}`);
  const startTime = Date.now();

  try {
    const updatedContext = await seedFn(context);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.success(`Seed ${seedName} concluído em ${duration}s`);
    return updatedContext;
  } catch (error) {
    logger.error(`Erro no seed ${seedName}:`, error);
    throw error;
  }
}

/**
 * Função genérica para fazer upsert de entidades com log
 */
export async function upsertEntities<T, D>(
  entityName: string,
  items: D[],
  upsertFn: (item: D) => Promise<T>,
  options: UpsertOptions | boolean = {}
): Promise<T[]> {
  // Compatibilidade com versão antiga que aceitava boolean
  const opts: UpsertOptions =
    typeof options === "boolean" ? { continueOnError: options } : options;

  const {
    continueOnError = true,
    logDetails = true,
    batchSize = items.length,
  } = opts;

  const createdItems: T[] = [];
  const errors: { item: D; error: any }[] = [];

  logger.info(`Processando ${items.length} ${entityName}(s)...`);

  // Processar em lotes se necessário
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Processar um lote
    for (const item of batch) {
      try {
        const createdItem = await upsertFn(item);

        if (logDetails) {
          logger.entity(entityName, getEntityName(createdItem));
        }

        createdItems.push(createdItem);
      } catch (error) {
        logger.error(`Erro ao processar ${entityName}:`, error);
        errors.push({ item, error });

        if (!continueOnError) {
          throw error;
        }
      }
    }

    // Mostrar progresso entre lotes
    if (items.length > batchSize) {
      logger.progress(
        Math.min(i + batchSize, items.length),
        items.length,
        entityName
      );
    }
  }

  // Resumo final
  if (errors.length > 0) {
    logger.warn(
      `${errors.length} erro(s) encontrado(s) durante o processamento de ${items.length} ${entityName}(s)`
    );
  } else {
    logger.success(
      `${items.length} ${entityName}(s) processado(s) com sucesso`
    );
  }

  return createdItems;
}

/**
 * Converte um array de entidades para um mapa nome -> entidade
 */
export function createEntityMap<T>(
  entities: T[],
  nameKey: keyof T = "name" as keyof T
): Record<string, T> {
  return entities.reduce((map, entity) => {
    const key = String(entity[nameKey]);
    map[key] = entity;
    return map;
  }, {} as Record<string, T>);
}

/**
 * Tenta extrair o nome de uma entidade para exibição em logs
 */
function getEntityName(entity: any): string {
  if (!entity) return "Desconhecido";
  if (typeof entity === "string") return entity;

  // Tentar encontrar propriedades comuns de nome
  const nameProps = ["name", "title", "code", "email", "certificateCode", "id"];
  for (const prop of nameProps) {
    if (entity[prop]) return entity[prop];
  }

  return JSON.stringify(entity).substring(0, 30) + "...";
}

/**
 * Verifica requisitos no contexto e lança erro se não estiverem presentes
 */
export function verifyContextRequirements(
  context: SeedContext,
  requirements: (keyof SeedContext)[],
  seedName: string
): void {
  const missingRequirements = requirements.filter((req) => !context[req]);

  if (missingRequirements.length > 0) {
    throw new Error(
      `Requisitos não encontrados no contexto para ${seedName}: ${missingRequirements.join(
        ", "
      )}. Execute os seeds correspondentes antes.`
    );
  }
}

/**
 * Mescla dois objetos de contexto, mantendo arrays únicos
 */
export function mergeContexts(
  contextA: SeedContext,
  contextB: SeedContext
): SeedContext {
  const result: SeedContext = { ...contextA };

  for (const key in contextB) {
    if (
      key in result &&
      Array.isArray(result[key]) &&
      Array.isArray(contextB[key])
    ) {
      // Se ambos são arrays, concatenar e remover duplicatas (baseado em id)
      const combinedArray = [...result[key], ...contextB[key]];

      // Remover duplicatas (assumindo que cada item tem um id)
      const uniqueMap = new Map();
      combinedArray.forEach((item) => {
        if (item.id) {
          uniqueMap.set(item.id, item);
        }
      });

      result[key] = Array.from(uniqueMap.values());
    } else {
      // Caso contrário, o valor de contextB sobrescreve o de contextA
      result[key] = contextB[key];
    }
  }

  return result;
}
