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
 * Interface para o contexto de seed tipado
 * Contém todos os tipos possíveis para os valores armazenados
 */
export interface SeedContext {
  // Entidades do sistema core
  adminUser?: User;
  adminRole?: Role;
  roles?: Role[];
  testUsers?: User[];

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
  resumes?: Resume[];
  jobOffers?: JobOffer[];
  jobApplications?: JobApplication[];
  jobRevisions?: JobRevision[];
  jobInterviews?: JobInterview[];

  // Propriedades adicionais
  [key: string]: any;
}

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

/**
 * Interface para campos de auditoria comuns
 * Útil para padronizar dados de criação/atualização
 */
export interface AuditFields {
  createdAt: Date;
  updatedAt: Date;
  createdById?: string;
  updatedById?: string | null;
}

/**
 * Interface para entidades com status
 */
export interface StatusFields {
  status: string | number;
  isActive?: boolean;
}
