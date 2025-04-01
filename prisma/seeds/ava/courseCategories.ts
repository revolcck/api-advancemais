import { CourseCategory, Status } from "@prisma/client";
import {
  SeedContext,
  createSlug,
  prisma,
  verifyContextRequirements,
  upsertEntities,
  createEntityMap,
} from "../utils";

/**
 * Seed para criar categorias de cursos
 */
export async function seedCourseCategories(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando categorias de cursos específicas...");

  // Verificar dependências no contexto
  verifyContextRequirements(
    context,
    ["adminUser", "courseAreas"],
    "seedCourseCategories"
  );

  // Mapeamento de áreas por nome para facilitar a referência
  const areaMap = createEntityMap(context.courseAreas!);

  // Exemplos de categorias específicas para algumas áreas
  const categories = [
    // Tecnologia
    {
      name: "Desenvolvimento Web",
      description: "Cursos de desenvolvimento front-end e back-end para web",
      areaName: "Tecnologia",
    },
    {
      name: "Ciência de Dados",
      description: "Cursos de análise de dados, big data e machine learning",
      areaName: "Tecnologia",
    },
    {
      name: "DevOps",
      description: "Cursos de integração entre desenvolvimento e operações",
      areaName: "Tecnologia",
    },
    {
      name: "Cibersegurança",
      description: "Cursos sobre segurança da informação e proteção de dados",
      areaName: "Tecnologia",
    },
    // Mais categorias conforme a necessidade...
  ];

  // Criar as categorias no banco de dados
  const createdCategories: CourseCategory[] = [];

  for (const category of categories) {
    const { areaName, ...categoryData } = category;

    // Encontrar a área correspondente
    const area = areaMap[areaName];

    if (area) {
      const slug = createSlug(category.name);
      try {
        const createdCategory = await prisma.courseCategory.upsert({
          where: { name: category.name },
          update: {
            ...categoryData,
            slug,
            areaId: area.id,
            status: Status.ACTIVE,
            updatedById: context.adminUser!.id,
          },
          create: {
            ...categoryData,
            slug,
            areaId: area.id,
            status: Status.ACTIVE,
            createdById: context.adminUser!.id,
          },
        });
        console.log(
          `Categoria criada: ${createdCategory.name} (Área: ${areaName})`
        );
        createdCategories.push(createdCategory);
      } catch (error) {
        console.error(`Erro ao criar categoria ${category.name}:`, error);
      }
    } else {
      console.warn(
        `Área ${areaName} não encontrada para a categoria ${category.name}`
      );
    }
  }

  return {
    ...context,
    courseCategories: createdCategories,
  };
}
