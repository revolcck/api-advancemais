import { CourseArea, Status } from "@prisma/client";
import { SeedContext, createSlug, prisma } from "../utils";

/**
 * Seed para criar áreas de cursos
 */
export async function seedCourseAreas(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando áreas de conhecimento para cursos...");

  if (!context.adminUser) {
    throw new Error(
      "Usuário administrador não encontrado no contexto. Execute o seed de usuários primeiro."
    );
  }

  // Lista de áreas de conhecimento
  const courseAreas = [
    {
      name: "Administração",
      description:
        "Cursos na área de gestão, administração de empresas e negócios",
      displayOrder: 1,
    },
    {
      name: "Tecnologia",
      description:
        "Cursos na área de tecnologia, computação, programação e sistemas",
      displayOrder: 2,
    },
    {
      name: "Recursos Humanos",
      description:
        "Cursos relacionados à gestão de pessoas, recrutamento e desenvolvimento humano",
      displayOrder: 3,
    },
    {
      name: "Marketing",
      description:
        "Cursos de marketing digital, branding, vendas e comunicação",
      displayOrder: 4,
    },
    {
      name: "Saúde",
      description: "Cursos na área da saúde, bem-estar e cuidados médicos",
      displayOrder: 5,
    },
    {
      name: "Educação",
      description:
        "Cursos voltados para professores, pedagogia e metodologias de ensino",
      displayOrder: 6,
    },
    {
      name: "Direito",
      description: "Cursos na área jurídica e legislação",
      displayOrder: 7,
    },
    {
      name: "Finanças",
      description:
        "Cursos de finanças, contabilidade, investimentos e economia",
      displayOrder: 8,
    },
    {
      name: "Engenharia",
      description: "Cursos nas diversas áreas de engenharia",
      displayOrder: 9,
    },
    {
      name: "Design",
      description:
        "Cursos de design gráfico, web design, UX/UI e artes visuais",
      displayOrder: 10,
    },
    {
      name: "Ciências Exatas",
      description:
        "Cursos de matemática, física, estatística e áreas relacionadas",
      displayOrder: 11,
    },
    {
      name: "Ciências Sociais",
      description:
        "Cursos de sociologia, antropologia, geografia e áreas relacionadas",
      displayOrder: 12,
    },
    {
      name: "Idiomas",
      description: "Cursos de línguas estrangeiras e comunicação",
      displayOrder: 13,
    },
    {
      name: "Desenvolvimento Pessoal",
      description:
        "Cursos de soft skills, liderança, produtividade e autoconhecimento",
      displayOrder: 14,
    },
  ];

  // Criar as áreas no banco de dados
  const createdAreas: CourseArea[] = [];

  for (const area of courseAreas) {
    const slug = createSlug(area.name);
    const createdArea = await prisma.courseArea.upsert({
      where: { name: area.name },
      update: {
        ...area,
        slug,
        status: Status.ACTIVE,
        updatedById: context.adminUser.id,
      },
      create: {
        ...area,
        slug,
        status: Status.ACTIVE,
        createdById: context.adminUser.id,
      },
    });
    console.log(`Área de curso criada: ${createdArea.name}`);
    createdAreas.push(createdArea);
  }

  return {
    ...context,
    courseAreas: createdAreas,
  };
}
