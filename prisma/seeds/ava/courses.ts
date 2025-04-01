import { Course, Status } from "@prisma/client";
import { SeedContext, createSlug, prisma } from "../utils";

/**
 * Seed para criar cursos de exemplo
 */
export async function seedCourses(context: SeedContext): Promise<SeedContext> {
  console.log("Criando cursos de exemplo...");

  if (!context.adminUser) {
    throw new Error(
      "Usuário administrador não encontrado no contexto. Execute o seed de usuários primeiro."
    );
  }

  // Pré-requisitos: verificar se temos as entidades necessárias
  if (
    !context.courseTypes ||
    !context.courseCategories ||
    !context.courseModalities
  ) {
    throw new Error(
      "Tipos de curso, categorias e modalidades não encontrados no contexto. Execute os seeds correspondentes primeiro."
    );
  }

  // Encontrar usuário do setor pedagógico para coordenador
  const pedagogicalUser = await prisma.user.findFirst({
    where: {
      role: {
        name: "Setor Pedagógico",
      },
    },
  });

  if (!pedagogicalUser) {
    console.warn(
      "Nenhum usuário do setor pedagógico encontrado. Usando admin como coordenador."
    );
  }

  const coordinatorId = pedagogicalUser?.id || context.adminUser.id;

  // Mapear tipos de curso por nome
  const courseTypeMap = context.courseTypes.reduce((map, type) => {
    map[type.name] = type;
    return map;
  }, {} as Record<string, (typeof context.courseTypes)[0]>);

  // Mapear categorias por nome
  const categoryMap = context.courseCategories.reduce((map, category) => {
    map[category.name] = category;
    return map;
  }, {} as Record<string, (typeof context.courseCategories)[0]>);

  // Mapear modalidades por nome
  const modalityMap = context.courseModalities.reduce((map, modality) => {
    map[modality.name] = modality;
    return map;
  }, {} as Record<string, (typeof context.courseModalities)[0]>);

  // Cursos de exemplo
  const courses = [
    {
      title: "Introdução ao Desenvolvimento Web",
      description:
        "Aprenda os fundamentos do desenvolvimento web moderno com HTML, CSS e JavaScript.",
      modalityName: "ONLINE",
      categoryName: "Desenvolvimento Web",
      typeName: "GRATUITO",
      workload: 40, // 40 horas
      startDate: new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000), // 15 dias a partir de agora
      accessPeriod: 90, // 90 dias de acesso
      supportPeriod: 30, // 30 dias de suporte
      price: null, // Gratuito
      isPublished: true,
      isHighlighted: true,
    },
    {
      title: "DevOps para Desenvolvedores",
      description:
        "Aprenda práticas de DevOps para melhorar o ciclo de vida de desenvolvimento de software.",
      modalityName: "ONLINE",
      categoryName: "DevOps",
      typeName: "PAGO",
      workload: 60, // 60 horas
      startDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000), // 30 dias a partir de agora
      accessPeriod: 180, // 180 dias de acesso
      supportPeriod: 60, // 60 dias de suporte
      price: 299.9, // R$ 299,90
      isPublished: true,
      isHighlighted: false,
    },
    {
      title: "Excel Avançado para Análise de Dados",
      description:
        "Domine fórmulas avançadas, tabelas dinâmicas e automação com VBA para análise de dados no Excel.",
      modalityName: "HIBRIDO",
      categoryName: "Ciência de Dados",
      typeName: "PAGO",
      workload: 30, // 30 horas
      startDate: new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000), // 10 dias a partir de agora
      accessPeriod: 120, // 120 dias de acesso
      supportPeriod: 45, // 45 dias de suporte
      price: 199.9, // R$ 199,90
      isPublished: true,
      isHighlighted: true,
    },
    {
      title: "Gestão de Projetos com Metodologias Ágeis",
      description:
        "Aprenda a gerenciar projetos com Scrum, Kanban e outras metodologias ágeis.",
      modalityName: "LIVE",
      categoryName: "Desenvolvimento Web",
      typeName: "PAGO",
      workload: 45, // 45 horas
      startDate: new Date(new Date().getTime() + 20 * 24 * 60 * 60 * 1000), // 20 dias a partir de agora
      accessPeriod: 150, // 150 dias de acesso
      supportPeriod: 60, // 60 dias de suporte
      price: 249.9, // R$ 249,90
      isPublished: true,
      isHighlighted: false,
    },
    {
      title: "Segurança da Informação para Desenvolvedores",
      description:
        "Aprenda as melhores práticas de segurança para proteger suas aplicações web e mobile.",
      modalityName: "ONLINE",
      categoryName: "Cibersegurança",
      typeName: "PAGO",
      workload: 50, // 50 horas
      startDate: new Date(new Date().getTime() + 25 * 24 * 60 * 60 * 1000), // 25 dias a partir de agora
      accessPeriod: 180, // 180 dias de acesso
      supportPeriod: 90, // 90 dias de suporte
      price: 349.9, // R$ 349,90
      isPublished: true,
      isHighlighted: true,
    },
  ];

  const createdCourses: Course[] = [];

  for (const course of courses) {
    // Verificar se temos os dados necessários
    const courseType = courseTypeMap[course.typeName];
    let category = categoryMap[course.categoryName];
    const modality = modalityMap[course.modalityName];

    if (!courseType || !modality) {
      console.warn(
        `Tipo de curso ou modalidade não encontrado para o curso ${course.title}. Pulando.`
      );
      continue;
    }

    // Se a categoria não existir, usar uma padrão
    if (!category) {
      category = context.courseCategories[0]; // Usar a primeira categoria disponível
      console.warn(
        `Categoria ${course.categoryName} não encontrada para o curso ${course.title}. Usando ${category.name}.`
      );
    }

    const { modalityName, categoryName, typeName, ...courseData } = course;
    const slug = createSlug(course.title);

    try {
      const createdCourse = await prisma.course.upsert({
        where: { slug },
        update: {
          ...courseData,
          categoryId: category.id,
          typeId: courseType.id,
          modalityId: modality.id,
          coordinatorId,
          updatedById: context.adminUser.id,
        },
        create: {
          ...courseData,
          slug,
          categoryId: category.id,
          typeId: courseType.id,
          modalityId: modality.id,
          coordinatorId,
          createdById: context.adminUser.id,
          status: Status.ACTIVE,
        },
      });

      console.log(`Curso criado: ${createdCourse.title}`);
      createdCourses.push(createdCourse);
    } catch (error) {
      console.error(`Erro ao criar curso ${course.title}:`, error);
    }
  }

  return {
    ...context,
    courses: createdCourses,
  };
}
