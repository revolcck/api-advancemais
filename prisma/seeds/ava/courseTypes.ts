import { CourseType, Status } from "@prisma/client";
import { SeedContext, prisma } from "../utils";

/**
 * Seed para criar tipos de cursos
 */
export async function seedCourseTypes(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando tipos de cursos...");

  if (!context.adminUser) {
    throw new Error(
      "Usuário administrador não encontrado no contexto. Execute o seed de usuários primeiro."
    );
  }

  const courseTypes = [
    { name: "GRATUITO", description: "Curso totalmente gratuito" },
    { name: "PAGO", description: "Curso com valor fixo pago uma única vez" },
    {
      name: "ASSINATURA",
      description: "Curso disponível mediante assinatura mensal",
    },
    {
      name: "FREEMIUM",
      description: "Curso com conteúdo básico gratuito e premium pago",
    },
    {
      name: "CERTIFICAÇÃO",
      description: "Curso preparatório para certificações profissionais",
    },
    { name: "IN_COMPANY", description: "Curso personalizado para empresas" },
  ];

  const createdTypes: CourseType[] = [];

  for (const type of courseTypes) {
    const createdType = await prisma.courseType.upsert({
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
    console.log(`Tipo de curso criado: ${createdType.name}`);
    createdTypes.push(createdType);
  }

  return {
    ...context,
    courseTypes: createdTypes,
  };
}
