import { LessonType, Status } from "@prisma/client";
import { SeedContext, prisma } from "../utils";

/**
 * Seed para criar tipos de aulas
 */
export async function seedLessonTypes(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando tipos de aulas...");

  if (!context.adminUser) {
    throw new Error(
      "Usuário administrador não encontrado no contexto. Execute o seed de usuários primeiro."
    );
  }

  const lessonTypes = [
    { name: "VIDEO", description: "Aula em formato de vídeo gravado" },
    { name: "TEXTO", description: "Aula em formato de texto/leitura" },
    {
      name: "QUIZ",
      description: "Atividade interativa com perguntas e respostas",
    },
    { name: "LIVE", description: "Aula ao vivo com interação em tempo real" },
    {
      name: "DOCUMENTO",
      description: "Material em formato de documento para download",
    },
    { name: "TAREFA", description: "Atividade prática para entrega" },
    {
      name: "FORUM",
      description: "Discussão em grupo sobre um tema específico",
    },
    { name: "PODCAST", description: "Conteúdo em formato de áudio" },
    { name: "WEBINAR", description: "Seminário ou apresentação online" },
    {
      name: "ESTUDO_DE_CASO",
      description: "Análise detalhada de situações reais",
    },
    {
      name: "LABORATÓRIO_VIRTUAL",
      description: "Ambiente de prática simulada",
    },
  ];

  const createdTypes: LessonType[] = [];

  for (const type of lessonTypes) {
    const createdType = await prisma.lessonType.upsert({
      where: { name: type.name },
      update: {
        ...type,
        status: Status.ACTIVE,
        updatedById: context.adminUser.id,
      },
      create: {
        ...type,
        status: Status.ACTIVE,
        createdById: context.adminUser.id,
      },
    });
    console.log(`Tipo de aula criado: ${createdType.name}`);
    createdTypes.push(createdType);
  }

  return {
    ...context,
    lessonTypes: createdTypes,
  };
}
