import {
  Certificate,
  CertificateStatus,
  Enrollment,
  Prisma,
} from "@prisma/client";
import {
  SeedContext,
  CodeGenerator,
  prisma,
  verifyContextRequirements,
} from "../utils";

/**
 * Interfaces para tipagem
 */
interface CertificateCreationResult {
  certificate: Certificate;
  isNew: boolean;
}

/**
 * Seed para criar exemplos de certificados emitidos
 */
export async function seedCertificates(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando certificados emitidos de exemplo...");

  // Verificar dependências no contexto
  verifyContextRequirements(context, ["adminUser"], "seedCertificates");

  // Buscar matrículas para associar os certificados
  const enrollments = await fetchEnrollmentsForCertificates();
  if (enrollments.length === 0) {
    console.warn("Nenhuma matrícula encontrada para criar certificados.");
    return context;
  }

  // Buscar templates de certificado
  const certificateTemplates = await prisma.certificateTemplate.findMany();
  if (certificateTemplates.length === 0) {
    console.warn("Nenhum template de certificado encontrado.");
  }

  // Criar certificados para as matrículas selecionadas
  const createdCertificates: Certificate[] = [];

  for (const enrollment of enrollments) {
    try {
      const result = await createOrUpdateCertificate(
        enrollment,
        certificateTemplates,
        context
      );

      console.log(
        `Certificado ${result.isNew ? "criado" : "atualizado"}: ${
          result.certificate.certificateCode
        } (${result.certificate.status})`
      );

      createdCertificates.push(result.certificate);
    } catch (error) {
      console.error(
        `Erro ao processar certificado para matrícula ${enrollment.id}:`,
        error
      );
    }
  }

  return {
    ...context,
    certificates: createdCertificates,
  };
}

/**
 * Busca matrículas para associar a certificados
 */
async function fetchEnrollmentsForCertificates(
  limit: number = 5
): Promise<Enrollment[]> {
  const enrollments = await prisma.enrollment.findMany({
    include: {
      user: true,
      course: true,
    },
    take: limit,
  });

  console.log(
    `Encontradas ${enrollments.length} matrículas para certificados.`
  );

  return enrollments;
}

/**
 * Cria ou atualiza um certificado para uma matrícula
 */
async function createOrUpdateCertificate(
  enrollment: Enrollment,
  templates: any[],
  context: SeedContext
): Promise<CertificateCreationResult> {
  // Definir status do certificado (alguns pendentes, outros emitidos)
  const status =
    Math.random() > 0.3 ? CertificateStatus.ISSUED : CertificateStatus.PENDING;

  // Gerar código único para o certificado
  const certificateCode = CodeGenerator.generateCertificateCode(enrollment);

  // Selecionar template e gerar dados aleatórios
  const template = selectRandomTemplate(templates);
  const certificateData = generateCertificateData(
    enrollment,
    template,
    certificateCode,
    status,
    context
  );

  // Verificar se já existe um certificado para esta matrícula
  const existingCertificate = await prisma.certificate.findFirst({
    where: { enrollmentId: enrollment.id },
  });

  if (existingCertificate) {
    // Atualizar certificado existente
    const certificate = await prisma.certificate.update({
      where: { id: existingCertificate.id },
      data: certificateData,
    });

    return { certificate, isNew: false };
  } else {
    // Criar novo certificado
    const certificate = await prisma.certificate.create({
      data: certificateData,
    });

    return { certificate, isNew: true };
  }
}

/**
 * Seleciona um template aleatório da lista de templates
 */
function selectRandomTemplate(templates: any[]): any | null {
  if (!templates || templates.length === 0) return null;
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Gera os dados para criação/atualização de um certificado
 */
function generateCertificateData(
  enrollment: Enrollment,
  template: any | null,
  certificateCode: string,
  status: CertificateStatus,
  context: SeedContext
): Prisma.CertificateCreateInput {
  // Dados aleatórios para o certificado
  const finalGrade = Number((7 + Math.random() * 3).toFixed(1)); // Entre 7.0 e 10.0
  const attendancePercentage = Math.floor(75 + Math.random() * 25); // Entre 75% e 100%
  const internshipHours =
    Math.random() > 0.5 ? Math.floor(40 + Math.random() * 80) : null;
  const internshipCompleted = Math.random() > 0.5;

  // Data de conclusão (entre 1 e 30 dias atrás)
  const completionDate = new Date();
  completionDate.setDate(
    completionDate.getDate() - Math.floor(1 + Math.random() * 30)
  );

  // Data de emissão (apenas para certificados emitidos)
  const issueDate =
    status === CertificateStatus.ISSUED
      ? new Date(completionDate.getTime() + 24 * 60 * 60 * 1000) // 1 dia após conclusão
      : null;

  // Criar dados base do certificado
  const certificateBaseData: Prisma.CertificateCreateInput = {
    enrollment: {
      connect: { id: enrollment.id },
    },
    template: template
      ? {
          connect: { id: template.id },
        }
      : undefined,
    status,
    certificateCode,
    completionDate,
    issueDate,
    finalGrade,
    attendancePercentage,
    internshipCompleted,
    internshipHours,
    completionCriteriaMet:
      "Aluno completou todos os requisitos necessários para emissão do certificado.",
    issuedBy:
      status === CertificateStatus.ISSUED && context.adminUser
        ? {
            connect: { id: context.adminUser.id },
          }
        : undefined,
  };

  // Adicionar assinaturas e URL apenas para certificados emitidos
  if (status === CertificateStatus.ISSUED) {
    certificateBaseData.signatures = {
      signatures: [
        {
          name: "João Silva",
          position: "Diretor Acadêmico",
          signatureUrl: "https://example.com/signatures/joao-silva.png",
        },
        {
          name: "Maria Oliveira",
          position: "Coordenadora Pedagógica",
          signatureUrl: "https://example.com/signatures/maria-oliveira.png",
        },
      ],
    } as Prisma.InputJsonValue;

    certificateBaseData.certificateUrl = `https://example.com/certificates/${certificateCode}.pdf`;
  }

  return certificateBaseData;
}
