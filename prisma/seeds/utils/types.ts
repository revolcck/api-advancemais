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
 * Tipo para uma função de seed
 */
export type SeedFunction = (ctx: SeedContext) => Promise<SeedContext>;

/**
 * Tipo para um seed registrado
 */
export interface RegisteredSeed {
  name: string;
  fn: SeedFunction;
  dependencies: string[];
  executed: boolean;
}

/**
 * Interface para o contexto de seed tipado
 * Contém todos os tipos possíveis para os valores armazenados
 */
export interface SeedContext {
  // Seeds registrados (começa com seed_)
  [key: `seed_${string}`]: RegisteredSeed;

  // Entidades do sistema
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

  // Propriedades adicionais
  [key: string]: any;
}

/**
 * Tipo para uma função de criação de dados de seed
 */
export type DataGeneratorFunction<T> = () => T[];

/**
 * Opções para upsert de entidades
 */
export interface UpsertOptions {
  continueOnError?: boolean;
  logDetails?: boolean;
  batchSize?: number;
}

/**
 * Config para um grupo de seeds
 */
export interface SeedGroupConfig {
  name: string;
  description?: string;
  seeds: string[];
  defaultOptions?: {
    stopOnError?: boolean;
    logLevel?: "verbose" | "normal" | "minimal";
  };
}
