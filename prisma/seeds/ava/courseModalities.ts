import { CourseModality, Status } from "@prisma/client";
import { SeedContext, prisma } from "../utils";

/**
 * Seed para criar modalidades de curso
 */
export async function seedCourseModalities(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando modalidades de curso...");

  if (!context.adminUser) {
    throw new Error(
      "Usuário administrador não encontrado no contexto. Execute o seed de usuários primeiro."
    );
  }

  const modalities = [
    {
      name: "ONLINE",
      description:
        "Curso totalmente online, com conteúdo gravado disponível 24/7",
    },
    {
      name: "PRESENCIAL",
      description: "Curso ministrado presencialmente em local físico",
    },
    {
      name: "HIBRIDO",
      description: "Curso com módulos online e presenciais",
    },
    {
      name: "LIVE",
      description: "Curso online com aulas ao vivo em horários programados",
    },
  ];

  const createdModalities: CourseModality[] = [];

  for (const modality of modalities) {
    const createdModality = await prisma.courseModality.upsert({
      where: { name: modality.name },
      update: {
        ...modality,
        status: Status.ACTIVE,
      },
      create: {
        ...modality,
        status: Status.ACTIVE,
      },
    });
    console.log(`Modalidade de curso criada: ${createdModality.name}`);
    createdModalities.push(createdModality);
  }

  return {
    ...context,
    courseModalities: createdModalities,
  };
}
