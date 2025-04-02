import { Resume, User, Prisma } from "@prisma/client";
import { SeedContext, prisma } from "../utils";

/**
 * Tipo extendido para Usuário com informações pessoais
 */
type UserWithPersonalInfo = User & {
  personalInfo?: {
    name: string;
    [key: string]: any;
  } | null;
};

/**
 * Cria currículos de exemplo para os alunos
 *
 * @param context O contexto atual do seed
 * @returns Contexto atualizado com os currículos criados
 */
export async function seedStudentResumes(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando currículos para alunos...");

  // Se já temos currículos no contexto, pular
  if (context.resumes && context.resumes.length > 0) {
    console.log(
      `Já existem ${context.resumes.length} currículos no contexto. Pulando criação.`
    );
    return context;
  }

  // Buscar alunos para criar currículos
  const students = await fetchStudentsForResumes();

  if (students.length === 0) {
    console.warn(
      "Nenhum aluno encontrado para criar currículos. Tentando criar um aluno padrão..."
    );
    // Aqui poderíamos criar um aluno padrão, mas vamos manter simples
    return context;
  }

  console.log(`Encontrados ${students.length} alunos para criar currículos`);

  // Criar currículos para os alunos
  const createdResumes = await createResumesForStudents(students);

  return {
    ...context,
    resumes: createdResumes,
  };
}

/**
 * Busca alunos para criar currículos
 *
 * @returns Lista de alunos com suas informações pessoais
 */
async function fetchStudentsForResumes(
  limit: number = 10
): Promise<UserWithPersonalInfo[]> {
  try {
    const students = (await prisma.user.findMany({
      where: {
        role: {
          name: "Aluno",
        },
        userType: "PESSOA_FISICA",
      },
      include: {
        personalInfo: true,
      },
      take: limit,
    })) as UserWithPersonalInfo[];

    return students;
  } catch (error) {
    console.error("Erro ao buscar alunos:", error);
    return [];
  }
}

/**
 * Cria currículos para lista de alunos
 *
 * @param students Lista de alunos para criar currículos
 * @returns Lista de currículos criados
 */
async function createResumesForStudents(
  students: UserWithPersonalInfo[]
): Promise<Resume[]> {
  const createdResumes: Resume[] = [];

  for (const student of students) {
    try {
      // Verificar se já tem currículo
      const existingResume = await prisma.resume.findUnique({
        where: { userId: student.id },
      });

      if (existingResume) {
        console.log(
          `Aluno ${
            student.personalInfo?.name || student.id
          } já possui currículo. Pulando criação.`
        );
        createdResumes.push(existingResume);
        continue;
      }

      // Criar currículo com dados básicos
      const resume = await createResumeWithDetails(student);
      createdResumes.push(resume);

      console.log(
        `Currículo criado para ${student.personalInfo?.name || student.id}`
      );
    } catch (error) {
      console.error(`Erro ao criar currículo para aluno ${student.id}:`, error);
    }
  }

  return createdResumes;
}

/**
 * Cria um currículo completo com experiências e formação para um aluno
 *
 * @param student O aluno para criar o currículo
 * @returns O currículo criado
 */
async function createResumeWithDetails(
  student: UserWithPersonalInfo
): Promise<Resume> {
  // Skill sets variados conforme área de atuação
  const skillSets = [
    {
      technical: ["JavaScript", "HTML", "CSS", "React", "Node.js"],
      soft: ["Comunicação", "Trabalho em equipe", "Resolução de problemas"],
      languages: [
        { language: "Português", level: "Nativo" },
        { language: "Inglês", level: "Intermediário" },
      ],
    },
    {
      technical: [
        "Python",
        "Django",
        "SQL",
        "Data Science",
        "Machine Learning",
      ],
      soft: ["Análise crítica", "Organização", "Proatividade"],
      languages: [
        { language: "Português", level: "Nativo" },
        { language: "Inglês", level: "Avançado" },
        { language: "Espanhol", level: "Básico" },
      ],
    },
    {
      technical: ["Java", "Spring", "Angular", "Docker", "AWS"],
      soft: ["Liderança", "Gestão de tempo", "Adaptabilidade"],
      languages: [
        { language: "Português", level: "Nativo" },
        { language: "Inglês", level: "Intermediário" },
      ],
    },
  ];

  // Escolher um conjunto de habilidades aleatório
  const randomSkills = skillSets[Math.floor(Math.random() * skillSets.length)];

  // Nomes comuns para resumo profissional
  const resumeText = `Profissional com experiência em tecnologia e educação. ${
    student.personalInfo?.name || "Profissional"
  } busca oportunidades para desenvolver suas habilidades em um ambiente dinâmico e inovador.`;

  // Criar o currículo base
  const resume = await prisma.resume.create({
    data: {
      userId: student.id,
      professionalSummary: resumeText,
      skillsJson: randomSkills as Prisma.JsonObject,
      isPublic: true,
    },
  });

  // Adicionar experiências profissionais (1-2 experiências)
  await addWorkExperiences(resume.id);

  // Adicionar formação acadêmica
  await addEducationHistory(resume.id);

  return resume;
}

/**
 * Adiciona experiências profissionais a um currículo
 *
 * @param resumeId ID do currículo
 */
async function addWorkExperiences(resumeId: string): Promise<void> {
  // Empresas de exemplo
  const companies = [
    { name: "Empresa Inovadora Ltda", position: "Desenvolvedor Junior" },
    { name: "Tech Solutions", position: "Analista de Sistemas" },
    { name: "Global Software", position: "Programador Full Stack" },
    { name: "Data Insights", position: "Analista de Dados" },
    { name: "Smart Education", position: "Instrutor de Tecnologia" },
  ];

  // Número de experiências (1 ou 2)
  const numExperiences = 1 + Math.floor(Math.random() * 2);

  // Criar experiências profissionais aleatórias
  for (let i = 0; i < numExperiences; i++) {
    // Escolher empresa aleatória
    const company = companies[Math.floor(Math.random() * companies.length)];

    // Datas aleatórias (entre 3 anos atrás e 6 meses atrás)
    const endDate = new Date(
      Date.now() - (6 + Math.random() * 18) * 30 * 24 * 60 * 60 * 1000
    );
    const startDate = new Date(
      endDate.getTime() - (12 + Math.random() * 24) * 30 * 24 * 60 * 60 * 1000
    );

    // Descrições possíveis
    const descriptions = [
      `Desenvolvimento de aplicações web utilizando ${
        company.name === "Data Insights"
          ? "Python e ferramentas de análise"
          : "JavaScript, React e Node.js"
      }.`,
      `Participação em projetos ${
        company.name === "Smart Education"
          ? "educacionais e treinamentos"
          : "de desenvolvimento de software"
      } para diversos clientes.`,
      `Atuação em equipe ${
        company.name === "Tech Solutions"
          ? "de suporte e implementação"
          : "ágil de desenvolvimento"
      } seguindo metodologias modernas.`,
    ];

    // Escolher descrição aleatória
    const description =
      descriptions[Math.floor(Math.random() * descriptions.length)];

    // Criar a experiência
    await prisma.workExperience.create({
      data: {
        resumeId,
        companyName: company.name,
        position: company.position,
        startDate,
        endDate,
        description,
      },
    });
  }
}

/**
 * Adiciona formação acadêmica a um currículo
 *
 * @param resumeId ID do currículo
 */
async function addEducationHistory(resumeId: string): Promise<void> {
  // Instituições de ensino
  const institutions = [
    {
      name: "Universidade Federal de Tecnologia",
      degree: "Bacharelado",
      field: "Ciência da Computação",
    },
    {
      name: "Faculdade de Engenharia e Tecnologia",
      degree: "Bacharelado",
      field: "Engenharia de Software",
    },
    {
      name: "Instituto Técnico Superior",
      degree: "Tecnólogo",
      field: "Análise e Desenvolvimento de Sistemas",
    },
    {
      name: "Academia Digital",
      degree: "Certificação",
      field: "Desenvolvimento Web Full Stack",
    },
  ];

  // Escolher instituição aleatória
  const institution =
    institutions[Math.floor(Math.random() * institutions.length)];

  // Datas aleatórias para formação (entre 5 anos atrás e 1 ano atrás)
  const endDate = new Date(
    Date.now() - (12 + Math.random() * 24) * 30 * 24 * 60 * 60 * 1000
  );
  const startDate = new Date(
    endDate.getTime() - (36 + Math.random() * 24) * 30 * 24 * 60 * 60 * 1000
  );

  // Criar formação acadêmica
  await prisma.education.create({
    data: {
      resumeId,
      institution: institution.name,
      degree: institution.degree,
      fieldOfStudy: institution.field,
      startDate,
      endDate,
      description: `Formação em ${institution.field} com foco em desenvolvimento de software e tecnologias modernas.`,
    },
  });
}
