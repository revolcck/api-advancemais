import {
  ContentType,
  Course,
  CourseModule,
  Lesson,
  ReleaseType,
  Status,
} from "@prisma/client";
import { SeedContext, createSlug, prisma } from "../utils";

/**
 * Seed para criar um curso de exemplo com módulos e aulas
 */
export async function seedExampleCourse(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando curso de exemplo com módulos e aulas...");

  if (!context.adminUser) {
    throw new Error(
      "Usuário administrador não encontrado no contexto. Execute o seed de usuários primeiro."
    );
  }

  // Verificar pré-requisitos
  if (
    !context.courseTypes ||
    !context.courseCategories ||
    !context.courseModalities ||
    !context.lessonTypes
  ) {
    throw new Error(
      "Dados necessários não encontrados no contexto. Execute os seeds correspondentes primeiro."
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

  // Encontrar usuário professor para as aulas
  const professorUser = await prisma.user.findFirst({
    where: {
      role: {
        name: "Professor",
      },
    },
  });

  if (!professorUser) {
    console.warn(
      "Nenhum usuário professor encontrado. Usando admin como professor."
    );
  }

  const professorId = professorUser?.id || context.adminUser.id;

  // Mapear tipos e categorias por nome
  const courseTypeMap = context.courseTypes.reduce((map, type) => {
    map[type.name] = type;
    return map;
  }, {} as Record<string, (typeof context.courseTypes)[0]>);

  const categoryMap = context.courseCategories.reduce((map, category) => {
    map[category.name] = category;
    return map;
  }, {} as Record<string, (typeof context.courseCategories)[0]>);

  const modalityMap = context.courseModalities.reduce((map, modality) => {
    map[modality.name] = modality;
    return map;
  }, {} as Record<string, (typeof context.courseModalities)[0]>);

  const lessonTypeMap = context.lessonTypes.reduce((map, type) => {
    map[type.name] = type;
    return map;
  }, {} as Record<string, (typeof context.lessonTypes)[0]>);

  // Dados do curso
  const courseData = {
    title: "Conhecendo o Mercado Digital",
    description:
      "Aprenda os fundamentos do marketing digital e como posicionar sua marca no ambiente online.",
    modalityName: "ONLINE",
    categoryName: "Marketing",
    typeName: "PAGO",
    workload: 40, // 40 horas
    startDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // 7 dias a partir de agora
    accessPeriod: 180, // 180 dias de acesso
    supportPeriod: 90, // 90 dias de suporte
    price: 199.9, // R$ 199,90
    isPublished: true,
    isHighlighted: true,
    thumbnailUrl: "https://example.com/curso-marketing-digital.jpg", // URL da imagem de capa
  };

  // Buscar os dados necessários
  const courseType = courseTypeMap[courseData.typeName];
  let category = categoryMap[courseData.categoryName];
  const modality = modalityMap[courseData.modalityName];

  if (!courseType || !modality) {
    throw new Error(
      `Tipo de curso ou modalidade não encontrado para o curso ${courseData.title}.`
    );
  }

  // Se a categoria não existir, usar uma padrão
  if (!category) {
    category = context.courseCategories[0]; // Usar a primeira categoria disponível
    console.warn(
      `Categoria ${courseData.categoryName} não encontrada para o curso ${courseData.title}. Usando ${category.name}.`
    );
  }

  const { modalityName, categoryName, typeName, ...courseCreateData } =
    courseData;
  const slug = createSlug(courseData.title);

  // Criar o curso
  let course: Course;
  try {
    course = await prisma.course.upsert({
      where: { slug },
      update: {
        ...courseCreateData,
        categoryId: category.id,
        typeId: courseType.id,
        modalityId: modality.id,
        coordinatorId,
        updatedById: context.adminUser.id,
      },
      create: {
        ...courseCreateData,
        slug,
        categoryId: category.id,
        typeId: courseType.id,
        modalityId: modality.id,
        coordinatorId,
        createdById: context.adminUser.id,
        status: Status.ACTIVE,
      },
    });

    console.log(`Curso criado: ${course.title}`);
  } catch (error) {
    console.error(`Erro ao criar curso ${courseData.title}:`, error);
    throw error;
  }

  // Adicionar professor ao curso
  try {
    await prisma.courseProfessor.create({
      data: {
        courseId: course.id,
        professorId: professorId,
        isMain: true,
      },
    });

    console.log(`Professor vinculado ao curso: ${course.title}`);
  } catch (error) {
    console.error(
      `Erro ao vincular professor ao curso ${course.title}:`,
      error
    );
    // Continuar mesmo com erro
  }

  // Criar módulos
  const modules = [
    {
      title: "Tudo o que você precisa saber sobre Infoprodutos",
      description: "Fundamentos dos infoprodutos digitais e como criá-los",
      order: 1,
      isRequired: true,
      status: Status.ACTIVE,
      professorId: professorId,
    },
    {
      title: "Melhores Equipamentos para seu curso online",
      description: "Conheça os equipamentos essenciais para criar seus cursos",
      order: 2,
      isRequired: true,
      status: Status.ACTIVE,
      professorId: professorId,
    },
  ];

  // Armazenar os módulos criados
  const createdModules: CourseModule[] = [];

  for (const moduleData of modules) {
    try {
      const createdModule = await prisma.courseModule.create({
        data: {
          ...moduleData,
          courseId: course.id,
          createdById: context.adminUser.id,
        },
      });

      console.log(`Módulo criado: ${createdModule.title}`);
      createdModules.push(createdModule);
    } catch (error) {
      console.error(`Erro ao criar módulo ${moduleData.title}:`, error);
      // Continuar mesmo com erro
    }
  }

  // Verificar se temos módulos criados para continuar
  if (createdModules.length === 0) {
    console.warn(
      "Nenhum módulo foi criado. Não será possível adicionar aulas."
    );
    return {
      ...context,
      exampleCourse: course,
    };
  }

  // Tipo de aula para vídeo
  const videoLessonType = lessonTypeMap["VIDEO"];
  const textLessonType = lessonTypeMap["TEXTO"];
  const liveLessonType = lessonTypeMap["LIVE"];

  if (!videoLessonType || !textLessonType || !liveLessonType) {
    console.warn("Tipos de aula necessários não encontrados. Usando padrões.");
    // Continuar mesmo sem os tipos específicos
  }

  // Criar aulas para o primeiro módulo
  const lessonModule1 = [
    {
      title: "O que é um infoproduto? (Youtube)",
      description: "Introdução aos infoprodutos e como funcionam",
      order: 1,
      duration: 15, // 15 minutos
      typeId: videoLessonType?.id || context.lessonTypes[0].id,
      contentType: ContentType.VIDEO_URL,
      videoUrl: "https://www.youtube.com/watch?v=example1",
      isRequired: true,
      status: Status.ACTIVE,
      professorId: professorId,
    },
    {
      title: "Ideias para empreender",
      description: "Como encontrar ideias lucrativas para infoprodutos",
      order: 2,
      duration: 20, // 20 minutos
      typeId: textLessonType?.id || context.lessonTypes[0].id,
      contentType: ContentType.EMBED,
      content: JSON.stringify({
        htmlContent: "<div>Conteúdo sobre ideias para empreender</div>",
      }),
      isRequired: true,
      status: Status.ACTIVE,
      professorId: professorId,
    },
    {
      title: "Aula ao vivo",
      description: "Sessão ao vivo para esclarecer dúvidas",
      order: 3,
      duration: 60, // 60 minutos
      typeId: liveLessonType?.id || context.lessonTypes[0].id,
      contentType: ContentType.EAD_MEET,
      liveDate: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000), // 14 dias a partir de agora
      isRequired: false,
      status: Status.ACTIVE,
      professorId: professorId,
    },
    {
      title: "Teste excel",
      description: "Material de estudo em Excel",
      order: 4,
      duration: 30, // 30 minutos
      typeId: textLessonType?.id || context.lessonTypes[0].id,
      contentType: ContentType.FILE,
      isRequired: true,
      status: Status.ACTIVE,
      professorId: professorId,
    },
  ];

  // Criar as aulas para o primeiro módulo
  const createdLessons: Lesson[] = [];

  for (const lessonData of lessonModule1) {
    try {
      const createdLesson = await prisma.lesson.create({
        data: {
          ...lessonData,
          moduleId: createdModules[0].id,
        },
      });

      console.log(`Aula criada: ${createdLesson.title}`);
      createdLessons.push(createdLesson);

      // Se for do tipo FILE, adicionar um arquivo de exemplo
      if (lessonData.contentType === ContentType.FILE) {
        await prisma.lessonFile.create({
          data: {
            lessonId: createdLesson.id,
            filename: "exemplo-excel.xlsx",
            originalName: "planilha-exemplo.xlsx",
            mimeType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            size: 12345,
            url: "https://example.com/files/exemplo-excel.xlsx",
            status: Status.ACTIVE,
          },
        });
        console.log(`Arquivo adicionado à aula: ${createdLesson.title}`);
      }
    } catch (error) {
      console.error(`Erro ao criar aula ${lessonData.title}:`, error);
      // Continuar mesmo com erro
    }
  }

  // Verificar se há um segundo módulo para adicionar aulas
  if (createdModules.length > 1) {
    // Criar aulas para o segundo módulo
    const lessonModule2 = [
      {
        title: "Equipamentos essenciais para gravação",
        description: "Os melhores equipamentos para gravar seus cursos",
        order: 1,
        duration: 25, // 25 minutos
        typeId: videoLessonType?.id || context.lessonTypes[0].id,
        contentType: ContentType.VIDEO_URL,
        videoUrl: "https://www.youtube.com/watch?v=example2",
        isRequired: true,
        status: Status.ACTIVE,
        professorId: professorId,
      },
      {
        title: "Iluminação e cenário",
        description: "Como montar o cenário perfeito para suas gravações",
        order: 2,
        duration: 20, // 20 minutos
        typeId: videoLessonType?.id || context.lessonTypes[0].id,
        contentType: ContentType.VIDEO_URL,
        videoUrl: "https://www.youtube.com/watch?v=example3",
        isRequired: true,
        status: Status.ACTIVE,
        professorId: professorId,
      },
    ];

    // Criar as aulas para o segundo módulo
    for (const lessonData of lessonModule2) {
      try {
        const createdLesson = await prisma.lesson.create({
          data: {
            ...lessonData,
            moduleId: createdModules[1].id,
          },
        });

        console.log(`Aula criada: ${createdLesson.title}`);
      } catch (error) {
        console.error(`Erro ao criar aula ${lessonData.title}:`, error);
        // Continuar mesmo com erro
      }
    }
  }

  // Adicionar produto relacionado ao curso
  try {
    await prisma.courseProduct.create({
      data: {
        courseId: course.id,
        name: courseData.title,
        description: courseData.description,
        type: "CURSO",
        status: Status.ACTIVE,
      },
    });

    console.log(`Produto relacionado ao curso criado: ${course.title}`);
  } catch (error) {
    console.error(`Erro ao criar produto para o curso ${course.title}:`, error);
    // Continuar mesmo com erro
  }

  // Retornar o contexto atualizado
  return {
    ...context,
    exampleCourse: course,
  };
}
