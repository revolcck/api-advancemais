import {
  Coupon,
  Course,
  CourseArea,
  CourseCategory,
  CourseModality,
  CourseType,
  Exam,
  ExamType,
  LessonType,
  PaymentMethod,
  PrismaClient,
  QuestionBank,
  Role,
  SubscriptionPlan,
  User,
} from "@prisma/client";

/**
 * Objeto Prisma singleton
 * Pode ser usado em todos os arquivos de seed
 */
export const prisma = new PrismaClient();

/**
 * Interface para o contexto de seed tipado
 * Contém todos os tipos possíveis para os valores armazenados
 */
export interface SeedContext {
  adminUser?: User;
  adminRole?: Role;
  roles?: Role[];

  // Domínio de pagamentos
  subscriptionPlans?: SubscriptionPlan[];
  paymentMethods?: PaymentMethod[];
  coupons?: Coupon[];

  // Domínio AVA (Ambiente Virtual de Aprendizagem)
  courseAreas?: CourseArea[];
  courseCategories?: CourseCategory[];
  courseTypes?: CourseType[];
  lessonTypes?: LessonType[];
  examTypes?: ExamType[];
  courseModalities?: CourseModality[];
  courses?: Course[];
  exampleCourse?: Course;
  questionBanks?: QuestionBank[];
  exams?: Exam[];

  // Adiciona suporte para propriedades dinâmicas
  [key: string]: any;
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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "-");
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
  for (const req of requirements) {
    if (!context[req]) {
      throw new Error(
        `${req} não encontrado no contexto. Execute os seeds correspondentes antes de ${seedName}.`
      );
    }
  }
}

/**
 * Função genérica para fazer upsert de entidades com log
 * @param entityName Nome da entidade para logs
 * @param items Array de itens a serem inseridos/atualizados
 * @param upsertFn Função que recebe o item e faz o upsert
 * @param continueOnError Continuar mesmo se ocorrer erro em um item (default: true)
 * @returns Array de entidades criadas
 */
export async function upsertEntities<T, D>(
  entityName: string,
  items: D[],
  upsertFn: (item: D) => Promise<T>,
  continueOnError: boolean = true
): Promise<T[]> {
  const createdItems: T[] = [];

  for (const item of items) {
    try {
      const createdItem = await upsertFn(item);
      console.log(`${entityName} criado: ${getEntityName(createdItem)}`);
      createdItems.push(createdItem);
    } catch (error) {
      console.error(`Erro ao criar ${entityName}:`, error);
      if (!continueOnError) {
        throw error;
      }
    }
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
  const nameProps = ["name", "title", "code", "email"];
  for (const prop of nameProps) {
    if (entity[prop]) return entity[prop];
  }

  // Fallback para id
  return entity.id || "Sem identificação";
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
  try {
    const updatedContext = await seedFn(context);
    console.log(`<< Seed ${seedName} concluído com sucesso`);
    return updatedContext;
  } catch (error) {
    console.error(`!! Erro ao executar seed ${seedName}:`, error);
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
  console.log(`\n=== Iniciando grupo de seeds: ${groupName} ===`);

  let currentContext = { ...context };

  for (const seed of seeds) {
    currentContext = await executeSeed(seed.name, seed.fn, currentContext);
  }

  console.log(`\n=== Grupo de seeds ${groupName} finalizado ===`);
  return currentContext;
}
