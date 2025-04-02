import { PrismaClient } from "@prisma/client";
import { SeedContext, UpsertOptions } from "./types";
import { logger } from "./logger";
import { seedManager } from "./SeedManager";

// Singleton do Prisma para usar em todos os seeds
export const prisma = seedManager.getPrisma();

// Re-exportações
export * from "./types";
export * from "./logger";
export * from "./SeedManager";
export * from "./StringUtils";
export * from "./CodeGenerator";

/**
 * Função genérica para fazer upsert de entidades com log
 * @param entityName Nome da entidade para logs
 * @param items Array de itens a serem inseridos/atualizados
 * @param upsertFn Função que recebe o item e faz o upsert
 * @param options Opções de upsert
 * @returns Array de entidades criadas
 */
export async function upsertEntities<T, D>(
  entityName: string,
  items: D[],
  upsertFn: (item: D) => Promise<T>,
  options: UpsertOptions | boolean = {}
): Promise<T[]> {
  // Compatibilidade com a versão antiga que aceitava boolean
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
 * @param entities Array de entidades
 * @param nameKey Chave a ser usada como nome (padrão: 'name')
 * @returns Mapa de nome para entidade
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
 * Executar uma função de seed com tratamento de erros padronizado
 * @param seedName Nome do seed para log
 * @param seedFn Função de seed a ser executada
 * @param context Contexto atual
 * @returns Contexto atualizado
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
 * Executa um grupo de seeds, mantendo o contexto
 */
export async function runSeedGroup(
  groupName: string,
  seeds: Array<{
    name: string;
    fn: (ctx: SeedContext) => Promise<SeedContext>;
  }>,
  context: SeedContext
): Promise<SeedContext> {
  logger.section(`Grupo de seeds: ${groupName}`);
  const startTime = Date.now();

  let currentContext = { ...context };

  for (const seed of seeds) {
    try {
      currentContext = await executeSeed(seed.name, seed.fn, currentContext);
    } catch (error) {
      logger.error(`Erro no grupo ${groupName}, seed ${seed.name}:`, error);
      // Se chegamos aqui, continueOnError deve ser verdadeiro
      logger.warn(`Continuando com o próximo seed...`);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.success(`Grupo ${groupName} finalizado em ${duration}s`);
  return currentContext;
}

/**
 * Formata uma data para exibição em logs
 * @param date Data a ser formatada
 * @returns String no formato DD/MM/YYYY HH:MM
 */
export function formatDate(date: Date): string {
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${date.getFullYear()} ${date
    .getHours()
    .toString()
    .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * Formata um valor monetário para exibição
 * @param value Valor a ser formatado
 * @returns String formatada (ex: R$ 10,00)
 */
export function formatCurrency(value: number | string): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return numValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Gera uma URL de acesso para uma entidade (para uso em retornos de API)
 * @param entityType Tipo da entidade (course, job, etc)
 * @param entityId ID da entidade
 * @returns URL para acesso à entidade
 */
export function generateAccessUrl(
  entityType: string,
  entityId: string
): string {
  const baseUrl = "https://exemplo.com";

  const routes: Record<string, string> = {
    course: "/courses",
    job: "/jobs",
    resume: "/resumes",
    certificate: "/certificates",
    subscription: "/user/subscriptions",
    application: "/user/applications",
  };

  const route = routes[entityType] || `/${entityType}s`;
  return `${baseUrl}${route}/${entityId}`;
}

/**
 * Verifica requisitos no contexto e lança erro se não estiverem presentes
 * @param context Contexto atual do seed
 * @param requirements Lista de chaves que devem existir no contexto
 * @param seedName Nome do seed para mensagem de erro
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
