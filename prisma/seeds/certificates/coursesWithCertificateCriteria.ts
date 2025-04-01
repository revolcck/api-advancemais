import { CompletionCriteria, Course, Status } from "@prisma/client";
import {
  SeedContext,
  createSlug,
  prisma,
  verifyContextRequirements,
} from "../utils";

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

  // Verificar se temos os templates de certificado
  if (!context.certificateTemplates) {
    console.warn(
      "Templates de certificado não encontrados no contexto. Execute o seed de templates primeiro."
    );
  }

  // Buscar cursos existentes
  const existingCourses = await prisma.course.findMany();
  if (existingCourses.length === 0) {
    console.warn("Nenhum curso encontrado para atualizar.");
    return context;
  }

  console.log(`Encontrados ${existingCourses.length} cursos para atualizar.`);

  // Buscar templates de certificado para associação
  const certificateTemplates =
    context.certificateTemplates ||
    (await prisma.certificateTemplate.findMany());

  if (certificateTemplates.length === 0) {
    console.warn("Nenhum template de certificado encontrado.");
  }

  // Mapear templates por critério de conclusão
  const templatesByCriteria: Record<string, any[]> =
    certificateTemplates.reduce((map: Record<string, any[]>, template) => {
      if (!map[template.requiredCompletion]) {
        map[template.requiredCompletion] = [];
      }
      map[template.requiredCompletion].push(template);
      return map;
    }, {});

  // Template padrão (fallback)
  const defaultTemplate =
    certificateTemplates.find((t) => t.isDefault) ||
    (certificateTemplates.length > 0 ? certificateTemplates[0] : null);

  // Atualizar cada curso com critérios de conclusão para certificados
  for (let i = 0; i < existingCourses.length; i++) {
    const course = existingCourses[i];

    // Determinar critério de conclusão com base no tipo de curso
    // Abordagem: Distribuir os critérios entre os cursos para demonstração
    let completionCriteria: CompletionCriteria;
    let certificateTemplate = null;
    let requiresInternship = false;
    let minGradeForCertificate: number | null = null;
    let minAttendanceForCertificate: number | null = null;
    let internshipHours: number | null = null;

    // Distribuir critérios entre os cursos (para demo)
    switch (i % 5) {
      case 0:
        // Curso com conclusão por módulos
        completionCriteria = CompletionCriteria.MODULE_COMPLETION;
        certificateTemplate = getRandomTemplate(
          templatesByCriteria[CompletionCriteria.MODULE_COMPLETION] || [
            defaultTemplate,
          ]
        );
        minAttendanceForCertificate = 75; // 75% de presença
        break;

      case 1:
        // Curso com conclusão por prova
        completionCriteria = CompletionCriteria.EXAM_ONLY;
        certificateTemplate = getRandomTemplate(
          templatesByCriteria[CompletionCriteria.EXAM_ONLY] || [defaultTemplate]
        );
        minGradeForCertificate = 7.0; // Nota mínima 7.0
        break;

      case 2:
        // Curso com conclusão por estágio
        completionCriteria = CompletionCriteria.INTERNSHIP_ONLY;
        certificateTemplate = getRandomTemplate(
          templatesByCriteria[CompletionCriteria.INTERNSHIP_ONLY] || [
            defaultTemplate,
          ]
        );
        requiresInternship = true;
        internshipHours = 80; // 80 horas de estágio
        break;

      case 3:
        // Curso com conclusão por prova e estágio
        completionCriteria = CompletionCriteria.EXAM_AND_INTERNSHIP;
        certificateTemplate = getRandomTemplate(
          templatesByCriteria[CompletionCriteria.EXAM_AND_INTERNSHIP] || [
            defaultTemplate,
          ]
        );
        requiresInternship = true;
        internshipHours = 120; // 120 horas de estágio
        minGradeForCertificate = 7.0; // Nota mínima 7.0
        break;

      case 4:
        // Curso com conclusão por presença
        completionCriteria = CompletionCriteria.ATTENDANCE_ONLY;
        certificateTemplate = getRandomTemplate(
          templatesByCriteria[CompletionCriteria.ATTENDANCE_ONLY] || [
            defaultTemplate,
          ]
        );
        minAttendanceForCertificate = 85; // 85% de presença
        break;

      default:
        completionCriteria = CompletionCriteria.MODULE_COMPLETION;
        certificateTemplate = defaultTemplate;
    }

    // Atualizar o curso com os critérios de conclusão
    try {
      await prisma.course.update({
        where: { id: course.id },
        data: {
          completionCriteria,
          certificateTemplateId: certificateTemplate?.id || null,
          requiresInternship,
          internshipHours,
          minGradeForCertificate,
          minAttendanceForCertificate,
          customCertificateRequirements:
            getCustomRequirements(completionCriteria),
        },
      });

      console.log(
        `Curso atualizado: ${course.title} - Critério: ${completionCriteria}`
      );
    } catch (error) {
      console.error(`Erro ao atualizar curso ${course.title}:`, error);
    }
  }

  // Criar um novo curso com critérios personalizados como exemplo
  await createCustomCriteriaCourse(context, certificateTemplates);

  return {
    ...context,
    // Retornar os cursos atualizados para contexto
    coursesWithCertificateCriteria: await prisma.course.findMany(),
  };
}

/**
 * Seleciona um template aleatório da lista ou retorna o primeiro se houver apenas um
 */
function getRandomTemplate(templates: any[] | null): any {
  if (!templates || templates.length === 0) return null;
  if (templates.length === 1) return templates[0];
  return templates[Math.floor(Math.random() * templates.length)];
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
  certificateTemplates: any[]
): Promise<void> {
  // Verificar se o adminUser existe
  if (!context.adminUser) {
    console.warn("Usuário administrador não encontrado no contexto.");
    return;
  }

  // Buscar dependências
  const courseTypes = await prisma.courseType.findMany();
  const courseCategories = await prisma.courseCategory.findMany();
  const courseModalities = await prisma.courseModality.findMany();

  if (
    !courseTypes.length ||
    !courseCategories.length ||
    !courseModalities.length
  ) {
    console.warn("Faltam dados para criar um curso personalizado de exemplo.");
    return;
  }

  // Encontrar tipos específicos ou usar os primeiros disponíveis
  const courseType =
    courseTypes.find((t) => t.name === "CERTIFICAÇÃO") || courseTypes[0];
  const category = courseCategories[0];
  const modality =
    courseModalities.find((m) => m.name === "HIBRIDO") || courseModalities[0];

  // Buscar coordenador
  const coordinator = (await prisma.user.findFirst({
    where: {
      role: {
        name: "Setor Pedagógico",
      },
    },
  })) || { id: context.adminUser.id };

  // Template personalizado ou padrão
  const customTemplate =
    certificateTemplates.find(
      (t) => t.requiredCompletion === CompletionCriteria.CUSTOM
    ) ||
    certificateTemplates.find((t) => t.isDefault) ||
    (certificateTemplates.length > 0 ? certificateTemplates[0] : null);

  // Dados do curso personalizado
  const courseData = {
    title: "Curso com Certificação Personalizada",
    description:
      "Este curso demonstra o uso de critérios personalizados para emissão de certificados.",
    slug: createSlug("Curso com Certificação Personalizada"),
    categoryId: category.id,
    typeId: courseType.id,
    modalityId: modality.id,
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

  try {
    const course = await prisma.course.upsert({
      where: { slug: courseData.slug },
      update: courseData,
      create: {
        ...courseData,
        createdById: context.adminUser.id,
      },
    });

    console.log(`Curso com critérios personalizados criado: ${course.title}`);
  } catch (error) {
    console.error("Erro ao criar curso com critérios personalizados:", error);
  }
}
