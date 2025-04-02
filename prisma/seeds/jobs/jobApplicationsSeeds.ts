import {
  ApplicationStatus,
  JobApplication,
  JobOffer,
  Resume,
  Prisma,
} from "@prisma/client";
import { SeedContext, prisma } from "../utils";

/**
 * Semente para criar candidaturas de alunos às vagas
 *
 * @param context O contexto atual do seed
 * @returns Contexto atualizado com as candidaturas criadas
 */
export async function seedJobApplications(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando candidaturas para vagas...");

  // Se já temos candidaturas no contexto, pular
  if (context.jobApplications && context.jobApplications.length > 0) {
    console.log(
      `Já existem ${context.jobApplications.length} candidaturas no contexto. Pulando criação.`
    );
    return context;
  }

  // Verificar se temos currículos e vagas no contexto
  const resumes = context.resumes || (await fetchResumes());
  const publishedJobs = context.jobOffers
    ? context.jobOffers.filter((job) => job.status === "PUBLISHED")
    : await fetchPublishedJobs();

  // Validar se temos dados suficientes
  if (resumes.length === 0) {
    console.warn(
      "Nenhum currículo encontrado. Não é possível criar candidaturas."
    );
    return context;
  }

  if (publishedJobs.length === 0) {
    console.warn(
      "Nenhuma vaga publicada encontrada. Não é possível criar candidaturas."
    );
    return context;
  }

  console.log(
    `Encontrados ${resumes.length} currículos e ${publishedJobs.length} vagas publicadas`
  );

  // Criar candidaturas
  const createdApplications = await createRandomApplications(
    resumes,
    publishedJobs
  );

  return {
    ...context,
    jobApplications: createdApplications,
  };
}

/**
 * Busca currículos no banco de dados
 *
 * @returns Lista de currículos
 */
async function fetchResumes(): Promise<Resume[]> {
  try {
    return await prisma.resume.findMany({
      where: {
        isPublic: true,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar currículos:", error);
    return [];
  }
}

/**
 * Busca vagas publicadas no banco de dados
 *
 * @returns Lista de vagas publicadas
 */
async function fetchPublishedJobs(): Promise<JobOffer[]> {
  try {
    return await prisma.jobOffer.findMany({
      where: {
        status: "PUBLISHED",
      },
    });
  } catch (error) {
    console.error("Erro ao buscar vagas publicadas:", error);
    return [];
  }
}

/**
 * Cria candidaturas aleatórias para currículos e vagas
 *
 * @param resumes Lista de currículos
 * @param jobs Lista de vagas
 * @returns Lista de candidaturas criadas
 */
async function createRandomApplications(
  resumes: Resume[],
  jobs: JobOffer[]
): Promise<JobApplication[]> {
  const createdApplications: JobApplication[] = [];

  // Para cada currículo, tentar candidatar a 1-3 vagas
  for (const resume of resumes) {
    try {
      // Cada candidato se aplica a 1-3 vagas aleatórias
      const numApplications = 1 + Math.floor(Math.random() * 3);

      // Embaralhar vagas e pegar as primeiras 'numApplications'
      const shuffledJobs = [...jobs]
        .sort(() => 0.5 - Math.random())
        .slice(0, numApplications);

      for (const job of shuffledJobs) {
        // Verificar se já existe uma candidatura para este par usuário-vaga
        const existingApplication = await prisma.jobApplication.findFirst({
          where: {
            jobOfferId: job.id,
            userId: resume.userId,
          },
        });

        if (existingApplication) {
          console.log(
            `Candidatura já existe para usuário ${resume.userId} na vaga ${job.title}. Pulando.`
          );
          createdApplications.push(existingApplication);
          continue;
        }

        // Definir status aleatório (com maior probabilidade para status iniciais)
        const status = getRandomApplicationStatus();

        // Criar a candidatura
        const application = await prisma.jobApplication.create({
          data: {
            jobOfferId: job.id,
            userId: resume.userId,
            resumeId: resume.id,
            status,
            notes:
              status !== ApplicationStatus.SUBMITTED
                ? "Candidato com perfil técnico adequado para a posição."
                : null,
          },
        });

        // Incrementar contador de candidaturas na vaga
        await updateJobApplicationCount(job.id);

        // Criar registro de status (histórico)
        await createStatusHistoryEntry(application.id, job.companyId, status);

        // Se status é entrevista agendada, criar uma entrevista
        if (status === ApplicationStatus.INTERVIEW_SCHEDULED) {
          await scheduleJobInterview(application.id, job.companyId);
        }

        createdApplications.push(application);
        console.log(
          `Candidatura criada: ${resume.userId} -> ${job.title} (Status: ${status})`
        );
      }
    } catch (error) {
      console.error(
        `Erro ao criar candidaturas para usuário ${resume.userId}:`,
        error
      );
    }
  }

  return createdApplications;
}

/**
 * Retorna um status aleatório para candidatura, com pesos
 * Mais provável para status iniciais do processo
 *
 * @returns Status aleatório
 */
function getRandomApplicationStatus(): ApplicationStatus {
  const random = Math.random();

  if (random < 0.4) {
    return ApplicationStatus.SUBMITTED;
  } else if (random < 0.6) {
    return ApplicationStatus.UNDER_REVIEW;
  } else if (random < 0.8) {
    return ApplicationStatus.INTERVIEW_SCHEDULED;
  } else if (random < 0.9) {
    return ApplicationStatus.TECHNICAL_TEST;
  } else {
    return ApplicationStatus.FINAL_INTERVIEW;
  }
}

/**
 * Atualiza o contador de candidaturas para uma vaga
 *
 * @param jobOfferId ID da vaga
 */
async function updateJobApplicationCount(jobOfferId: string): Promise<void> {
  try {
    await prisma.jobOffer.update({
      where: { id: jobOfferId },
      data: {
        applicationCount: { increment: 1 },
      },
    });
  } catch (error) {
    console.error(
      `Erro ao atualizar contador de candidaturas para vaga ${jobOfferId}:`,
      error
    );
  }
}

/**
 * Cria um registro no histórico de status da candidatura
 *
 * @param applicationId ID da candidatura
 * @param companyId ID da empresa (para definir quem alterou o status)
 * @param status Status atual
 */
async function createStatusHistoryEntry(
  applicationId: string,
  companyId: string,
  status: ApplicationStatus
): Promise<void> {
  try {
    // Se o status é diferente de SUBMITTED, criar um registro de transição
    if (status !== ApplicationStatus.SUBMITTED) {
      await prisma.applicationStatusHistory.create({
        data: {
          applicationId,
          changedById: companyId, // A empresa fez a mudança
          previousStatus: ApplicationStatus.SUBMITTED,
          newStatus: status,
          notes: getNoteForStatus(status),
        },
      });
    }

    // Sempre criar o registro inicial
    await prisma.applicationStatusHistory.create({
      data: {
        applicationId,
        changedById: companyId,
        previousStatus: ApplicationStatus.SUBMITTED, // Status inicial sempre é SUBMITTED
        newStatus: ApplicationStatus.SUBMITTED,
        notes: "Candidatura recebida",
      },
    });
  } catch (error) {
    console.error(
      `Erro ao criar histórico de status para candidatura ${applicationId}:`,
      error
    );
  }
}

/**
 * Agenda uma entrevista para candidatura que está no status INTERVIEW_SCHEDULED
 *
 * @param applicationId ID da candidatura
 * @param companyId ID da empresa
 */
async function scheduleJobInterview(
  applicationId: string,
  companyId: string
): Promise<void> {
  try {
    // Gerar data nos próximos 10 dias
    const interviewDate = new Date();
    interviewDate.setDate(
      interviewDate.getDate() + Math.floor(Math.random() * 10) + 1
    );

    // Diferentes tipos de entrevista
    const meetingTypes = [
      "Google Meet",
      "Microsoft Teams",
      "Zoom",
      "Presencial",
    ];
    const meetingType =
      meetingTypes[Math.floor(Math.random() * meetingTypes.length)];

    // Possíveis durações em minutos
    const durations = [30, 45, 60, 90];
    const duration = durations[Math.floor(Math.random() * durations.length)];

    // Criar a entrevista
    await prisma.jobInterview.create({
      data: {
        applicationId,
        scheduleDateTime: interviewDate,
        duration,
        meetingUrl:
          meetingType !== "Presencial"
            ? `https://${meetingType
                .toLowerCase()
                .replace(" ", "")}.com/example-meeting-url`
            : null,
        location:
          meetingType === "Presencial"
            ? "Escritório da empresa - Av. Paulista, 1000, São Paulo/SP"
            : null,
        meetingType,
        notes:
          "Entrevista inicial para conhecer o candidato e discutir detalhes da vaga.",
        createdById: companyId,
      },
    });

    console.log(
      `Entrevista agendada para candidatura ${applicationId}: ${interviewDate.toLocaleDateString()}`
    );
  } catch (error) {
    console.error(
      `Erro ao agendar entrevista para candidatura ${applicationId}:`,
      error
    );
  }
}

/**
 * Retorna uma nota explicativa para cada status de candidatura
 *
 * @param status Status da candidatura
 * @returns Texto explicativo
 */
function getNoteForStatus(status: ApplicationStatus): string {
  switch (status) {
    case ApplicationStatus.UNDER_REVIEW:
      return "Currículo sendo analisado pela equipe de recrutamento";

    case ApplicationStatus.INTERVIEW_SCHEDULED:
      return "Candidato selecionado para entrevista inicial";

    case ApplicationStatus.TECHNICAL_TEST:
      return "Candidato aprovado para etapa técnica";

    case ApplicationStatus.FINAL_INTERVIEW:
      return "Candidato aprovado para entrevista final";

    case ApplicationStatus.OFFER_EXTENDED:
      return "Proposta enviada ao candidato";

    case ApplicationStatus.HIRED:
      return "Candidato contratado";

    case ApplicationStatus.REJECTED:
      return "Perfil não atende aos requisitos necessários para a vaga";

    default:
      return `Status atualizado para ${status}`;
  }
}
