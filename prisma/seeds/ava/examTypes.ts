import { ExamType, Status } from "@prisma/client";
import { SeedContext, prisma } from "../utils";

/**
 * Seed para criar tipos de provas
 */
export async function seedExamTypes(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando tipos de provas...");

  if (!context.adminUser) {
    throw new Error(
      "Usuário administrador não encontrado no contexto. Execute o seed de usuários primeiro."
    );
  }

  const examTypes = [
    {
      name: "ONLINE",
      description: "Avaliação realizada online com tempo controlado",
    },
    { name: "PRESENCIAL", description: "Avaliação realizada presencialmente" },
    { name: "PROJETO", description: "Avaliação baseada em projeto prático" },
    {
      name: "DISSERTATIVA",
      description: "Avaliação com questões dissertativas",
    },
    {
      name: "MULTIPLA_ESCOLHA",
      description: "Avaliação com questões de múltipla escolha",
    },
    {
      name: "MISTA",
      description: "Avaliação com questões dissertativas e de múltipla escolha",
    },
    { name: "PROVA_ORAL", description: "Avaliação realizada verbalmente" },
    { name: "APRESENTAÇÃO", description: "Avaliação por meio de apresentação" },
    { name: "SIMULADO", description: "Simulação de prova oficial" },
    {
      name: "AUTOAVALIAÇÃO",
      description: "Processo de avaliação pelo próprio aluno",
    },
  ];

  const createdTypes: ExamType[] = [];

  for (const type of examTypes) {
    const createdType = await prisma.examType.upsert({
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
    console.log(`Tipo de prova criado: ${createdType.name}`);
    createdTypes.push(createdType);
  }

  return {
    ...context,
    examTypes: createdTypes,
  };
}
