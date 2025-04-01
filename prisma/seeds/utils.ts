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
  subscriptionPlans?: SubscriptionPlan[];
  paymentMethods?: PaymentMethod[];
  coupons?: Coupon[];
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
  [key: string]: any;
}
