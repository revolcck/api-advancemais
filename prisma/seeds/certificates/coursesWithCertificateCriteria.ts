import {
  CertificateTemplate,
  CompletionCriteria,
  Course,
  Status,
} from "@prisma/client";
import {
  SeedContext,
  StringUtils,
  prisma,
  verifyContextRequirements,
} from "../utils";

/**
 * Interfaces para tipagem
 */
interface CourseUpdateData {
  completionCriteria: CompletionCriteria;
  certificateTemplateId: string | null;
  requiresInternship: boolean;
  minGradeForCertificate: number | null;
  minAttendanceForCertificate: number | null;
  internshipHours: number | null;
  customCertificateRequirements: string | null;
}

interface CustomCourseData {
  title: string;
  description: string;
  slug: string;
  categoryId: string;
  typeId: string;
  modalityId: string;
  coordinatorId: string;
  workload: number;
  startDate: Date;
  accessPeriod: number;
  supportPeriod: number;
  price: number;
  isPublished: boolean;
  isHighlighted: boolean;
  status: Status;
  completionCriteria: CompletionCriteria;
  certificateTemplateId: string | null;
  requiresInternship: boolean;
  internshipHours: number;
  minGradeForCertificate: number;
  minAttendanceForCertificate: number;
  customCertificateRequirements: string;
}

/**
 * Tipo para o mapa de templates por critério
 */
type TemplatesByCriteriaMap = {
  [key in CompletionCriteria]?: CertificateTemplate[];
};

/**
 * Seed para criar cursos com critérios de conclusão para certificados
 */
export async function seedCoursesWithCertificateCriteria(
  context: SeedContext
): Promise<SeedContext> {
  console.log(
    "Atualizando cursos com critérios de conclusão para certificados..."
  );

  // Verificar dependências no contexto
  verifyContextRequirements(
    context,
    ["adminUser"],
    "seedCoursesWithCertificateCriteria"
  );

  // Buscar templates de certificado
  const certificateTemplates = await fetchCertificateTemplates(context);
  if (certificateTemplates.length === 0) {
    console.warn("Nenhum template de certificado encontrado.");
  }

  // Buscar cursos existentes
  const existingCourses = await prisma.course.findMany();
  if (existingCourses.length === 0) {
    console.warn("Nenhum curso encontrado para atualizar.");
    return context;
  }

  console.log(`Encontrados ${existingCourses.length} cursos para atualizar.`);

  // Mapear templates por critério de conclusão
  const templatesByCriteria = mapTemplatesByCriteria(certificateTemplates);

  // Template padrão (fallback)
  const defaultTemplate = findDefaultTemplate(certificateTemplates);

  // Atualizar cada curso com critérios de conclusão
  const updatedCourses: Course[] = [];

  for (let i = 0; i < existingCourses.length; i++) {
    const course = existingCourses[i];

    // Determinar critérios de conclusão com base no índice
    const certificateData = generateCertificateDataForCourse(
      i,
      templatesByCriteria,
      defaultTemplate
    );

    try {
      const updatedCourse = await updateCourseWithCertificateData(
        course,
        certificateData
      );
      updatedCourses.push(updatedCourse);
      console.log(
        `Curso atualizado: ${updatedCourse.title} - Critério: ${updatedCourse.completionCriteria}`
      );
    } catch (error) {
      console.error(`Erro ao atualizar curso ${course.title}:`, error);
    }
  }

  // Criar um curso com critérios personalizados como exemplo
  try {
    const customCourse = await createCustomCriteriaCourse(
      context,
      certificateTemplates
    );
    if (customCourse) {
      updatedCourses.push(customCourse);
    }
  } catch (error) {
    console.error("Erro ao criar curso com critérios personalizados:", error);
  }

  return {
    ...context,
    coursesWithCertificateCriteria: updatedCourses,
  };
}

/**
 * Busca e retorna templates de certificado
 */
async function fetchCertificateTemplates(
  context: SeedContext
): Promise<CertificateTemplate[]> {
  return (
    (context.certificateTemplates as CertificateTemplate[]) ||
    (await prisma.certificateTemplate.findMany())
  );
}

/**
 * Mapeia templates por critério de conclusão
 */
function mapTemplatesByCriteria(
  templates: CertificateTemplate[]
): TemplatesByCriteriaMap {
  const templateMap: TemplatesByCriteriaMap = {};

  for (const template of templates) {
    const criteriaKey = template.requiredCompletion;
    if (!templateMap[criteriaKey]) {
      templateMap[criteriaKey] = [];
    }
    templateMap[criteriaKey]?.push(template);
  }

  return templateMap;
}

/**
 * Encontra o template padrão ou o primeiro disponível
 */
function findDefaultTemplate(
  templates: CertificateTemplate[]
): CertificateTemplate | null {
  if (!templates || templates.length === 0) return null;
  return templates.find((t) => t.isDefault) || templates[0];
}

/**
 * Seleciona um template aleatório da lista
 */
function selectRandomTemplate(
  templates: CertificateTemplate[] | undefined,
  defaultTemplate: CertificateTemplate | null
): CertificateTemplate | null {
  if (!templates || templates.length === 0) return defaultTemplate;
  if (templates.length === 1) return templates[0];
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Gera dados de conclusão de certificado para um curso
 */
function generateCertificateDataForCourse(
  index: number,
  templatesByCriteria: TemplatesByCriteriaMap,
  defaultTemplate: CertificateTemplate | null
): CourseUpdateData {
  let completionCriteria: CompletionCriteria;
  let certificateTemplate: CertificateTemplate | null = null;
  let requiresInternship = false;
  let minGradeForCertificate: number | null = null;
  let minAttendanceForCertificate: number | null = null;
  let internshipHours: number | null = null;

  // Distribuir critérios entre os cursos (para demo)
  switch (index % 5) {
    case 0:
      // Curso com conclusão por módulos
      completionCriteria = CompletionCriteria.MODULE_COMPLETION;
      certificateTemplate = selectRandomTemplate(
        templatesByCriteria[CompletionCriteria.MODULE_COMPLETION],
        defaultTemplate
      );
      minAttendanceForCertificate = 75; // 75% de presença
      break;

    case 1:
      // Curso com conclusão por prova
      completionCriteria = CompletionCriteria.EXAM_ONLY;
      certificateTemplate = selectRandomTemplate(
        templatesByCriteria[CompletionCriteria.EXAM_ONLY],
        defaultTemplate
      );
      minGradeForCertificate = 7.0; // Nota mínima 7.0
      break;

    case 2:
      // Curso com conclusão por estágio
      completionCriteria = CompletionCriteria.INTERNSHIP_ONLY;
      certificateTemplate = selectRandomTemplate(
        templatesByCriteria[CompletionCriteria.INTERNSHIP_ONLY],
        defaultTemplate
      );
      requiresInternship = true;
      internshipHours = 80; // 80 horas de estágio
      break;

    case 3:
      // Curso com conclusão por prova e estágio
      completionCriteria = CompletionCriteria.EXAM_AND_INTERNSHIP;
      certificateTemplate = selectRandomTemplate(
        templatesByCriteria[CompletionCriteria.EXAM_AND_INTERNSHIP],
        defaultTemplate
      );
      requiresInternship = true;
      internshipHours = 120; // 120 horas de estágio
      minGradeForCertificate = 7.0; // Nota mínima 7.0
      break;

    case 4:
      // Curso com conclusão por presença
      completionCriteria = CompletionCriteria.ATTENDANCE_ONLY;
      certificateTemplate = selectRandomTemplate(
        templatesByCriteria[CompletionCriteria.ATTENDANCE_ONLY],
        defaultTemplate
      );
      minAttendanceForCertificate = 85; // 85% de presença
      break;

    default:
      completionCriteria = CompletionCriteria.MODULE_COMPLETION;
      certificateTemplate = defaultTemplate;
  }

  return {
    completionCriteria,
    certificateTemplateId: certificateTemplate?.id || null,
    requiresInternship,
    internshipHours,
    minGradeForCertificate,
    minAttendanceForCertificate,
    customCertificateRequirements: getCustomRequirements(completionCriteria),
  };
}

/**
 * Atualiza um curso com dados de certificação
 */
async function updateCourseWithCertificateData(
  course: Course,
  certificateData: CourseUpdateData
): Promise<Course> {
  return prisma.course.update({
    where: { id: course.id },
    data: certificateData,
  });
}

/**
 * Gera requisitos personalizados com base no critério de conclusão
 */
function getCustomRequirements(criteria: CompletionCriteria): string | null {
  switch (criteria) {
    case CompletionCriteria.EXAM_ONLY:
      return "O aluno deve ser aprovado na prova final com nota mínima.";

    case CompletionCriteria.INTERNSHIP_ONLY:
      return "O aluno deve concluir o estágio obrigatório com carga horária completa.";

    case CompletionCriteria.EXAM_AND_INTERNSHIP:
      return "O aluno deve ser aprovado na prova final e concluir o estágio obrigatório.";

    case CompletionCriteria.ATTENDANCE_ONLY:
      return "O aluno deve cumprir o percentual mínimo de presença.";

    case CompletionCriteria.MODULE_COMPLETION:
      return "O aluno deve concluir todos os módulos do curso.";

    case CompletionCriteria.CUSTOM:
      return "Requisitos personalizados conforme definido pela coordenação do curso.";

    default:
      return null;
  }
}

/**
 * Cria um curso com critérios personalizados como exemplo
 */
async function createCustomCriteriaCourse(
  context: SeedContext,
  certificateTemplates: CertificateTemplate[]
): Promise<Course | null> {
  // Verificar se o adminUser existe
  if (!context.adminUser) {
    console.warn("Usuário administrador não encontrado no contexto.");
    return null;
  }

  // Buscar dependências
  const dependencies = await fetchDependenciesForCustomCourse();
  if (!dependencies) return null;

  const { courseTypes, courseCategories, courseModalities, coordinator } =
    dependencies;

  // Template personalizado ou padrão
  const customTemplate = findCustomCourseTemplate(certificateTemplates);

  // Dados do curso personalizado
  const courseData: CustomCourseData = {
    title: "Curso com Certificação Personalizada",
    description:
      "Este curso demonstra o uso de critérios personalizados para emissão de certificados.",
    slug: StringUtils.createSlug("Curso com Certificação Personalizada"),
    categoryId: courseCategories.id,
    typeId: courseTypes.id,
    modalityId: courseModalities.id,
    coordinatorId: coordinator.id,
    workload: 120,
    startDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000), // 30 dias a partir de agora
    accessPeriod: 180,
    supportPeriod: 60,
    price: 499.9,
    isPublished: true,
    isHighlighted: true,
    status: Status.ACTIVE,

    // Critérios específicos para certificado
    completionCriteria: CompletionCriteria.CUSTOM,
    certificateTemplateId: customTemplate?.id || null,
    requiresInternship: true,
    internshipHours: 40,
    minGradeForCertificate: 8.0,
    minAttendanceForCertificate: 80,
    customCertificateRequirements:
      "O aluno deve: 1) Completar todos os módulos, 2) Obter nota mínima de 8.0 na prova final, " +
      "3) Ter 80% de presença nas aulas síncronas, 4) Realizar 40 horas de estágio, " +
      "5) Apresentar e ser aprovado no projeto final perante banca avaliadora.",
  };

  // Criar ou atualizar o curso
  const course = await prisma.course.upsert({
    where: { slug: courseData.slug },
    update: courseData,
    create: {
      ...courseData,
      createdById: context.adminUser.id,
    },
  });

  console.log(
    `Curso com critérios personalizados ${
      course.id ? "atualizado" : "criado"
    }: ${course.title}`
  );
  return course;
}

/**
 * Busca as dependências necessárias para criar um curso personalizado
 */
async function fetchDependenciesForCustomCourse() {
  // Buscar dependências
  const courseTypes =
    (await prisma.courseType.findFirst({
      where: { name: "CERTIFICAÇÃO" },
    })) || (await prisma.courseType.findFirst());

  const courseCategories = await prisma.courseCategory.findFirst();
  const courseModalities =
    (await prisma.courseModality.findFirst({
      where: { name: "HIBRIDO" },
    })) || (await prisma.courseModality.findFirst());

  // Buscar coordenador
  const coordinator =
    (await prisma.user.findFirst({
      where: {
        role: {
          name: "Setor Pedagógico",
        },
      },
    })) ||
    (await prisma.user.findFirst({
      where: {
        role: {
          name: "Administrador",
        },
      },
    }));

  if (!courseTypes || !courseCategories || !courseModalities || !coordinator) {
    console.warn("Faltam dados para criar um curso personalizado de exemplo.");
    return null;
  }

  return {
    courseTypes,
    courseCategories,
    courseModalities,
    coordinator,
  };
}

/**
 * Encontra um template adequado para curso com critérios personalizados
 */
function findCustomCourseTemplate(
  templates: CertificateTemplate[]
): CertificateTemplate | null {
  return (
    templates.find((t) => t.requiredCompletion === CompletionCriteria.CUSTOM) ||
    templates.find((t) => t.isDefault) ||
    (templates.length > 0 ? templates[0] : null)
  );
}
