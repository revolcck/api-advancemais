import {
  Certificate,
  CertificateTemplate,
  Coupon,
  Course,
  CourseArea,
  CourseCategory,
  CourseModality,
  CourseType,
  Enrollment,
  Exam,
  ExamType,
  JobApplication,
  JobInterview,
  JobOffer,
  JobRevision,
  LessonType,
  PaymentMethod,
  PrismaClient,
  QuestionBank,
  Resume,
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

  // Domínio de certificados
  certificateTemplates?: CertificateTemplate[];
  certificates?: Certificate[];
  coursesWithCertificateCriteria?: Course[];

  // Domínio do sistema de vagas e recrutamento
  resumes?: Resume[]; // Currículos de alunos
  jobOffers?: JobOffer[]; // Vagas publicadas
  jobApplications?: JobApplication[]; // Candidaturas
  jobRevisions?: JobRevision[]; // Revisões de vagas
  jobInterviews?: JobInterview[]; // Entrevistas agendadas

  // Adiciona suporte para propriedades dinâmicas
  [key: string]: any;
}

/**
 * Utilitários para manipulação de strings
 */
export const StringUtils = {
  /**
   * Cria um slug a partir de um nome
   * @param name Nome para converter em slug
   * @returns Slug em formato URL-friendly
   */
  createSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^\w\s]/g, "") // Remove caracteres especiais
      .replace(/\s+/g, "-") // Substitui espaços por hífens
      .replace(/-+/g, "-"); // Remove hífens duplicados
  },

  /**
   * Formata uma data no formato AAAAMMDD
   * @param date Data a ser formatada
   * @returns String no formato AAAAMMDD
   */
  formatDateYYYYMMDD(date: Date = new Date()): string {
    return date.toISOString().slice(0, 10).replace(/-/g, "");
  },

  /**
   * Trunca um texto para o tamanho desejado
   * @param text Texto a ser truncado
   * @param length Tamanho desejado
   * @returns Texto truncado com reticências
   */
  truncate(text: string, length: number = 50): string {
    if (!text || text.length <= length) return text;
    return text.substring(0, length - 3) + "...";
  },

  /**
   * Gera um texto aleatório para testes
   * @param length Tamanho desejado do texto
   * @returns Texto aleatório
   */
  randomText(length: number = 10): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
};

/**
 * Utilitários para a geração de códigos únicos
 */
export const CodeGenerator = {
  /**
   * Gera um código único para certificado baseado em dados da matrícula
   * @param enrollment Matrícula do aluno
   * @param prefix Prefixo para o código (padrão: CERT)
   * @returns Código único no formato PREFIX-AAAAMMDD-XXXX-YYYY-ZZZZZZ
   */
  generateCertificateCode(
    enrollment: Enrollment,
    prefix: string = "CERT"
  ): string {
    // Extrai partes para compor o código
    const timestamp = new Date().getTime().toString().slice(-6);
    const userId = enrollment.userId.slice(0, 4);
    const courseId = enrollment.courseId.slice(0, 4);
    const dateStr = StringUtils.formatDateYYYYMMDD();

    // Formato: CERT-AAAAMMDD-XXXX-YYYY-ZZZZZZ
    return `${prefix}-${dateStr}-${userId}-${courseId}-${timestamp}`;
  },

  /**
   * Gera um código de rastreamento aleatório para diversos fins
   * @param prefix Prefixo do código (padrão: TRK)
   * @param length Tamanho do código (padrão: 10)
   * @returns Código alfanumérico único
   */
  generateTrackingCode(prefix: string = "TRK", length: number = 10): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${prefix}-${result}`;
  },

  /**
   * Gera um código para vaga (formato JOB-AAAAMMDD-XXXX)
   * @param companyId ID da empresa (usado para tornar o código único)
   * @returns Código único para vaga
   */
  generateJobCode(companyId: string): string {
    const companyPart = companyId.slice(0, 4).toUpperCase();
    const dateStr = StringUtils.formatDateYYYYMMDD();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");

    return `JOB-${dateStr}-${companyPart}-${random}`;
  },
};

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
  const errors: { item: D; error: any }[] = [];

  for (const item of items) {
    try {
      const createdItem = await upsertFn(item);
      console.log(`${entityName} criado: ${getEntityName(createdItem)}`);
      createdItems.push(createdItem);
    } catch (error) {
      console.error(`Erro ao criar ${entityName}:`, error);
      errors.push({ item, error });

      if (!continueOnError) {
        throw error;
      }
    }
  }

  // Resumo final
  if (errors.length > 0) {
    console.warn(
      `${errors.length} erros encontrados durante o processamento de ${items.length} itens`
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
  const nameProps = ["name", "title", "code", "email", "certificateCode"];
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
  const startTime = Date.now();

  let currentContext = { ...context };

  for (const seed of seeds) {
    currentContext = await executeSeed(seed.name, seed.fn, currentContext);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(
    `\n=== Grupo de seeds ${groupName} finalizado em ${duration}s ===`
  );
  return currentContext;
}

/**
 * Cria um slug a partir de um nome (função mantida para compatibilidade)
 * @deprecated Use StringUtils.createSlug em vez desta função
 */
export function createSlug(name: string): string {
  return StringUtils.createSlug(name);
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
