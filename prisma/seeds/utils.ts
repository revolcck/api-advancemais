import { PrismaClient } from "@prisma/client";
import { SeedContext, UpsertOptions } from "./utils/types";

// Re-exportar todos os utilitários da pasta utils
export * from "./utils/types";
export * from "./utils/logger";
export * from "./utils/SeedManager";
export * from "./utils/StringUtils";
export * from "./utils/CodeGenerator";

// Singleton do Prisma para usar em todos os seeds
import { seedManager } from "./utils/SeedManager";
export const prisma = seedManager.getPrisma();

/**
 * Função genérica para fazer upsert de entidades com log
 * @param entityName Nome da entidade para logs
 * @param items Array de itens a serem inseridos/atualizados
 * @param upsertFn Função que recebe o item e faz o upsert
 * @param options Opções de upsert ou flag de continueOnError
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

  console.log(`Processando ${items.length} ${entityName}(s)...`);

  // Processar em lotes se necessário
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Processar um lote
    for (const item of batch) {
      try {
        const createdItem = await upsertFn(item);

        if (logDetails) {
          console.log(`${entityName} criado: ${getEntityName(createdItem)}`);
        }

        createdItems.push(createdItem);
      } catch (error) {
        console.error(`Erro ao processar ${entityName}:`, error);
        errors.push({ item, error });

        if (!continueOnError) {
          throw error;
        }
      }
    }

    // Mostrar progresso entre lotes
    if (items.length > batchSize) {
      console.log(
        `Progresso: ${Math.min(i + batchSize, items.length)}/${
          items.length
        } ${entityName}(s)`
      );
    }
  }

  // Resumo final
  if (errors.length > 0) {
    console.warn(
      `${errors.length} erro(s) encontrado(s) durante o processamento de ${items.length} ${entityName}(s)`
    );
  } else {
    console.log(`${items.length} ${entityName}(s) processado(s) com sucesso`);
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
  console.log(`\n>> Executando seed: ${seedName}`);
  const startTime = Date.now();

  try {
    const updatedContext = await seedFn(context);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`<< Seed ${seedName} concluído com sucesso em ${duration}s`);
    return updatedContext;
  } catch (error) {
    console.error(`!! Erro ao executar seed ${seedName}:`, error);
    throw error;
  }
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
      )}. 
      Execute os seeds correspondentes antes.`
    );
  }
}

/**
 * Cria um slug a partir de um nome
 * @param name Nome para converter em slug
 * @returns Slug em formato URL-friendly
 */
export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^\w\s]/g, "") // Remove caracteres especiais
    .replace(/\s+/g, "-") // Substitui espaços por hífens
    .replace(/-+/g, "-"); // Remove hífens duplicados
}

/**
 * Mescla dois objetos de contexto, mantendo arrays únicos
 * @param contextA Primeiro contexto
 * @param contextB Segundo contexto
 * @returns Contexto mesclado
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
