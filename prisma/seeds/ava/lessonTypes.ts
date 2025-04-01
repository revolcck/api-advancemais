import { LessonType, Status } from "@prisma/client";
import { SeedContext, prisma } from "../utils";

/**
 * Seed para criar tipos de aulas com descrição expandida
 */
export async function seedLessonTypes(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando tipos de aulas detalhados...");

  if (!context.adminUser) {
    throw new Error(
      "Usuário administrador não encontrado no contexto. Execute o seed de usuários primeiro."
    );
  }

  const lessonTypes = [
    {
      name: "VIDEO",
      description:
        "Aula em formato de vídeo gravado ou link externo (YouTube, Vimeo, etc.)",
    },
    {
      name: "TEXTO",
      description: "Aula em formato de texto ou HTML formatado",
    },
    {
      name: "QUIZ",
      description: "Atividade interativa com perguntas e respostas",
    },
    {
      name: "LIVE",
      description:
        "Aula ao vivo com interação em tempo real (EAD Live ou externa)",
    },
    {
      name: "DOCUMENTO",
      description:
        "Material em formato de documento para download (PDF, Word, etc.)",
    },
    {
      name: "ARQUIVO",
      description: "Arquivos para download (Excel, PowerPoint, PDFs, etc.)",
    },
    {
      name: "FORUM",
      description: "Discussão em grupo sobre um tema específico",
    },
    {
      name: "PODCAST",
      description: "Conteúdo em formato de áudio",
    },
    {
      name: "CONFERENCIA",
      description: "Conferência online via EAD Meet ou plataforma externa",
    },
    {
      name: "EMBED",
      description: "Conteúdo incorporado de fontes externas via código HTML",
    },
    {
      name: "HTML",
      description: "Página HTML personalizada com conteúdo formatado",
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
