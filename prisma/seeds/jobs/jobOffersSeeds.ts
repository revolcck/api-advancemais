import {
  ExperienceLevel,
  HiringType,
  JobOffer,
  JobStatus,
  Subscription,
  User,
  SubscriptionPlan,
} from "@prisma/client";
import { SeedContext, prisma } from "../utils";

/**
 * Interface para os dados de uma vaga
 */
interface JobOfferData {
  title: string;
  description: string;
  location: string;
  experienceLevel: ExperienceLevel;
  hiringType: HiringType;
  isConfidential: boolean;
  startDate: Date;
  endDate: Date;
  maxApplications: number | null;
}

/**
 * Tipo para empresa com assinaturas
 */
type CompanyWithSubscriptions = User & {
  companyInfo?: {
    companyName: string;
    [key: string]: any;
  } | null;
  subscriptions: Array<
    Subscription & {
      plan?: SubscriptionPlan | null;
    }
  >;
};

/**
 * Semente para criar vagas de emprego
 *
 * @param context O contexto atual do seed
 * @returns Contexto atualizado com as vagas criadas
 */
export async function seedJobOffers(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando vagas de emprego...");

  // Se já temos vagas no contexto, pular
  if (context.jobOffers && context.jobOffers.length > 0) {
    console.log(
      `Já existem ${context.jobOffers.length} vagas no contexto. Pulando criação.`
    );
    return context;
  }

  // Buscar empresas com assinaturas ativas
  const companies = await fetchCompaniesWithSubscriptions();

  if (companies.length === 0) {
    console.warn(
      "Nenhuma empresa com assinatura ativa encontrada. Não é possível criar vagas."
    );
    return context;
  }

  console.log(
    `Encontradas ${companies.length} empresas com assinaturas ativas`
  );

  // Buscar recrutadores para revisar as vagas
  const recruiters = await fetchRecruiters();

  // Definir exemplos de vagas
  const jobOffersData = generateJobOffersData();

  // Criar as vagas distribuindo entre as empresas
  const createdJobs = await createJobOffers(
    companies,
    recruiters,
    jobOffersData
  );

  return {
    ...context,
    jobOffers: createdJobs,
  };
}

/**
 * Busca empresas com assinaturas ativas
 *
 * @returns Lista de empresas com suas assinaturas
 */
async function fetchCompaniesWithSubscriptions(
  limit: number = 5
): Promise<CompanyWithSubscriptions[]> {
  try {
    const companies = (await prisma.user.findMany({
      where: {
        userType: "PESSOA_JURIDICA",
        companyInfo: {
          isNot: null,
        },
        subscriptions: {
          some: {
            status: "ACTIVE",
          },
        },
      },
      include: {
        companyInfo: true,
        subscriptions: {
          where: {
            status: "ACTIVE",
          },
          include: {
            plan: true,
          },
        },
      },
      take: limit,
    })) as CompanyWithSubscriptions[];

    // Se não encontrar empresas com assinaturas, buscar qualquer empresa
    if (companies.length === 0) {
      console.log(
        "Nenhuma empresa com assinatura ativa encontrada. Buscando qualquer empresa..."
      );

      return (await prisma.user.findMany({
        where: {
          userType: "PESSOA_JURIDICA",
          companyInfo: {
            isNot: null,
          },
        },
        include: {
          companyInfo: true,
          subscriptions: {
            include: {
              plan: true,
            },
          },
        },
        take: limit,
      })) as CompanyWithSubscriptions[];
    }

    return companies;
  } catch (error) {
    console.error("Erro ao buscar empresas:", error);
    return [];
  }
}

/**
 * Busca recrutadores para revisar as vagas
 *
 * @returns Lista de recrutadores
 */
async function fetchRecruiters(limit: number = 3): Promise<User[]> {
  try {
    const recruiters = await prisma.user.findMany({
      where: {
        role: {
          name: "Recrutadores",
        },
      },
      take: limit,
    });

    if (recruiters.length === 0) {
      console.log("Nenhum recrutador encontrado. Buscando administradores...");

      // Se não encontrar recrutadores, usar administradores
      return await prisma.user.findMany({
        where: {
          role: {
            name: "Administrador",
          },
        },
        take: limit,
      });
    }

    return recruiters;
  } catch (error) {
    console.error("Erro ao buscar recrutadores:", error);
    return [];
  }
}

/**
 * Gera dados para vagas de exemplo
 *
 * @returns Lista de dados para criação de vagas
 */
function generateJobOffersData(): JobOfferData[] {
  // Base para as vagas de tecnologia
  const techJobsBase = [
    {
      title: "Desenvolvedor Full Stack",
      description:
        "Estamos procurando um desenvolvedor full stack com experiência em React e Node.js para trabalhar em nossos projetos web. O candidato ideal deve ter experiência em desenvolvimento front-end e back-end, banco de dados e APIs RESTful.",
      locations: [
        "São Paulo, SP",
        "Remoto",
        "Campinas, SP",
        "Rio de Janeiro, RJ",
      ],
      experienceLevel: ExperienceLevel.PLENO,
      hiringType: HiringType.CLT,
    },
    {
      title: "Engenheiro de Dados",
      description:
        "Vaga para Engenheiro de Dados para trabalhar com grandes volumes de dados e implementar soluções de ETL. Experiência com ferramentas como Apache Spark, Hadoop, e bancos de dados SQL e NoSQL é desejável.",
      locations: ["Remoto", "São Paulo, SP", "Porto Alegre, RS"],
      experienceLevel: ExperienceLevel.SENIOR,
      hiringType: HiringType.PJ,
    },
    {
      title: "UX/UI Designer",
      description:
        "Empresa busca UX/UI Designer para criar interfaces inovadoras para aplicativos mobile e web. O profissional deve ter portfolio com cases de sucesso e conhecimentos em ferramentas como Figma, Adobe XD ou Sketch.",
      locations: ["Rio de Janeiro, RJ", "Remoto", "Belo Horizonte, MG"],
      experienceLevel: ExperienceLevel.PLENO,
      hiringType: HiringType.CLT,
    },
    {
      title: "Analista de Marketing Digital",
      description:
        "Vaga para analista de marketing digital com foco em SEO e gestão de campanhas em redes sociais. Desejável experiência com ferramentas analíticas, Google Ads e Meta Ads.",
      locations: ["Remoto", "São Paulo, SP", "Brasília, DF"],
      experienceLevel: ExperienceLevel.JUNIOR,
      hiringType: HiringType.CLT,
    },
    {
      title: "Estágio em TI",
      description:
        "Programa de estágio em TI para estudantes de Ciência da Computação ou áreas relacionadas. Oportunidade de aprendizado em desenvolvimento de software, infraestrutura de TI e suporte técnico.",
      locations: ["Belo Horizonte, MG", "São Paulo, SP", "Curitiba, PR"],
      experienceLevel: ExperienceLevel.ESTAGIO,
      hiringType: HiringType.ESTAGIO,
    },
    {
      title: "Desenvolvedor Mobile",
      description:
        "Desenvolvedor com experiência em desenvolvimento de aplicativos móveis para iOS e Android. Conhecimentos em React Native, Swift ou Kotlin serão diferenciais.",
      locations: ["Porto Alegre, RS", "Remoto", "Florianópolis, SC"],
      experienceLevel: ExperienceLevel.PLENO,
      hiringType: HiringType.CLT,
    },
    {
      title: "Cientista de Dados",
      description:
        "Cientista de Dados com sólidos conhecimentos em estatística, machine learning e visualização de dados. Experiência com Python, R e ferramentas de BI é essencial.",
      locations: ["São Paulo, SP", "Remoto", "Campinas, SP"],
      experienceLevel: ExperienceLevel.SENIOR,
      hiringType: HiringType.PJ,
    },
    {
      title: "Arquiteto de Software",
      description:
        "Arquiteto de Software para definir e implementar arquiteturas escaláveis e resilientes. Experiência com nuvem, microsserviços e práticas DevOps é fundamental.",
      locations: ["São Paulo, SP", "Rio de Janeiro, RJ", "Remoto"],
      experienceLevel: ExperienceLevel.ESPECIALISTA,
      hiringType: HiringType.CLT,
    },
  ];

  // Gerar vagas com base nos templates
  const jobOffers: JobOfferData[] = techJobsBase.map((baseJob) => {
    // Escolher local aleatório
    const location =
      baseJob.locations[Math.floor(Math.random() * baseJob.locations.length)];

    // Prazo aleatório (15-90 dias)
    const daysActive = 15 + Math.floor(Math.random() * 75);
    const startDate = new Date();
    const endDate = new Date(
      startDate.getTime() + daysActive * 24 * 60 * 60 * 1000
    );

    // Limite de candidaturas (null ou 20-100)
    const maxApplications =
      Math.random() > 0.3 ? 20 + Math.floor(Math.random() * 80) : null;

    // Confidencialidade (20% de chance de ser confidencial)
    const isConfidential = Math.random() < 0.2;

    return {
      title: baseJob.title,
      description: baseJob.description,
      location,
      experienceLevel: baseJob.experienceLevel,
      hiringType: baseJob.hiringType,
      isConfidential,
      startDate,
      endDate,
      maxApplications,
    };
  });

  return jobOffers;
}

/**
 * Cria vagas no banco de dados
 *
 * @param companies Lista de empresas
 * @param recruiters Lista de recrutadores
 * @param jobOffersData Dados das vagas a serem criadas
 * @returns Lista de vagas criadas
 */
async function createJobOffers(
  companies: CompanyWithSubscriptions[],
  recruiters: User[],
  jobOffersData: JobOfferData[]
): Promise<JobOffer[]> {
  const createdJobs: JobOffer[] = [];

  // Distribuir as vagas entre as empresas
  for (let i = 0; i < jobOffersData.length; i++) {
    // Selecionar empresa e dados da vaga
    const company = companies[i % companies.length];
    const jobData = jobOffersData[i];

    // Verificar se a empresa tem um plano e pode publicar vagas confidenciais
    const subscription = company.subscriptions && company.subscriptions[0];
    const plan = subscription?.plan;

    // Se a vaga é confidencial mas o plano não permite, torná-la não confidencial
    if (jobData.isConfidential && plan && plan.confidentialOffers === false) {
      jobData.isConfidential = false;
    }

    // Determinar status com base no índice (para ter exemplos de cada status)
    // Distribuição de status: 25% rascunho, 25% pendente, 50% publicada
    let status: JobStatus;
    let reviewerId: string | null = null;

    if (i % 4 === 0) {
      status = JobStatus.DRAFT;
    } else if (i % 4 === 1) {
      status = JobStatus.PENDING_APPROVAL;
    } else {
      status = JobStatus.PUBLISHED;
      // Atribuir revisor para vagas publicadas
      if (recruiters.length > 0) {
        reviewerId = recruiters[i % recruiters.length].id;
      }
    }

    try {
      // Criar a vaga
      const job = await prisma.jobOffer.create({
        data: {
          ...jobData,
          companyId: company.id,
          status,
          reviewerId,
        },
      });

      console.log(`Vaga criada: ${job.title} (Status: ${job.status})`);
      createdJobs.push(job);

      // Se a vaga foi publicada ou está pendente, incrementar contador de vagas
      if (
        (job.status === JobStatus.PUBLISHED ||
          job.status === JobStatus.PENDING_APPROVAL) &&
        subscription
      ) {
        await updateSubscriptionJobCount(subscription.id);
      }

      // Se a vaga foi publicada e tem revisor, criar registro de revisão
      if (job.status === JobStatus.PUBLISHED && reviewerId) {
        await createJobRevision(job.id, reviewerId);
      }
    } catch (error) {
      console.error(`Erro ao criar vaga "${jobData.title}":`, error);
    }
  }

  return createdJobs;
}

/**
 * Atualiza o contador de vagas usadas em uma assinatura
 *
 * @param subscriptionId ID da assinatura
 */
async function updateSubscriptionJobCount(
  subscriptionId: string
): Promise<void> {
  try {
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        usedJobOffers: { increment: 1 },
      },
    });
  } catch (error) {
    console.error(
      `Erro ao atualizar contador de vagas da assinatura ${subscriptionId}:`,
      error
    );
  }
}

/**
 * Cria registro de revisão para uma vaga
 *
 * @param jobOfferId ID da vaga
 * @param revisorId ID do revisor
 */
async function createJobRevision(
  jobOfferId: string,
  revisorId: string
): Promise<void> {
  try {
    await prisma.jobRevision.create({
      data: {
        jobOfferId,
        revisorId,
        changesJson: {
          action: "APPROVE",
          previousStatus: "PENDING_APPROVAL",
          newStatus: "PUBLISHED",
          changes: [
            { field: "status", from: "PENDING_APPROVAL", to: "PUBLISHED" },
          ],
          notes: "Vaga aprovada sem alterações.",
        },
      },
    });
  } catch (error) {
    console.error(
      `Erro ao criar registro de revisão para vaga ${jobOfferId}:`,
      error
    );
  }
}
