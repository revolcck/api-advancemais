import { CertificateStatus } from "@prisma/client";
import { SeedContext, prisma, verifyContextRequirements } from "../utils";

/**
 * Seed para criar exemplos de certificados emitidos
 */
export async function seedCertificates(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando certificados emitidos de exemplo...");

  // Verificar dependências no contexto
  verifyContextRequirements(context, ["adminUser"], "seedCertificates");

  // Verificar se temos matrículas para associar os certificados
  const enrollments = await prisma.enrollment.findMany({
    include: {
      user: true,
      course: true,
    },
    take: 5, // Limitar a 5 matrículas para exemplo
  });

  if (enrollments.length === 0) {
    console.warn("Nenhuma matrícula encontrada para criar certificados.");
    return context;
  }

  console.log(
    `Encontradas ${enrollments.length} matrículas para certificados.`
  );

  // Buscar templates de certificado
  const certificateTemplates = await prisma.certificateTemplate.findMany();

  if (certificateTemplates.length === 0) {
    console.warn("Nenhum template de certificado encontrado.");
  }

  // Criar certificados para algumas matrículas
  const createdCertificates = [];

  for (const enrollment of enrollments) {
    // Definir status do certificado (alguns pendentes, outros emitidos)
    const status =
      Math.random() > 0.3
        ? CertificateStatus.ISSUED
        : CertificateStatus.PENDING;

    // Gerar código único para o certificado
    const certificateCode = generateCertificateCode(enrollment);

    // Dados aleatórios para o certificado
    const finalGrade = Number((7 + Math.random() * 3).toFixed(1)); // Entre 7.0 e 10.0
    const attendancePercentage = Math.floor(75 + Math.random() * 25); // Entre 75% e 100%

    // Selecionar um template apropriado ou usar o primeiro disponível
    const template =
      certificateTemplates.length > 0
        ? certificateTemplates[
            Math.floor(Math.random() * certificateTemplates.length)
          ]
        : null;

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

    // Determinar o internshipHours
    const internshipHours =
      Math.random() > 0.5 ? Math.floor(40 + Math.random() * 80) : null;

    // Dados do certificado
    try {
      const certificateData = {
        enrollmentId: enrollment.id,
        templateId: template?.id || null,
        status,
        certificateCode,
        completionDate,
        issueDate,
        finalGrade,
        attendancePercentage,
        internshipCompleted: Math.random() > 0.5,
        internshipHours,
        completionCriteriaMet:
          "Aluno completou todos os requisitos necessários para emissão do certificado.",
        issuedById:
          status === CertificateStatus.ISSUED ? context.adminUser!.id : null,
      };

      // Adicionar assinaturas e URL apenas para certificados emitidos
      const additionalData: any = {};

      if (status === CertificateStatus.ISSUED) {
        additionalData.signatures = {
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
        };

        additionalData.certificateUrl = `https://example.com/certificates/${certificateCode}.pdf`;
      }

      // Verificar se já existe um certificado para esta matrícula
      const existingCertificate = await prisma.certificate.findFirst({
        where: { enrollmentId: enrollment.id },
      });

      if (existingCertificate) {
        // Atualizar o existente
        const updatedCertificate = await prisma.certificate.update({
          where: { id: existingCertificate.id },
          data: {
            ...certificateData,
            ...additionalData,
          },
        });

        console.log(
          `Certificado atualizado: ${updatedCertificate.certificateCode} (${updatedCertificate.status})`
        );
        createdCertificates.push(updatedCertificate);
      } else {
        // Criar novo
        const createdCertificate = await prisma.certificate.create({
          data: {
            ...certificateData,
            ...additionalData,
          },
        });

        console.log(
          `Certificado criado: ${createdCertificate.certificateCode} (${createdCertificate.status})`
        );
        createdCertificates.push(createdCertificate);
      }
    } catch (error) {
      console.error(
        `Erro ao criar certificado para matrícula ${enrollment.id}:`,
        error
      );
      console.error("Detalhes do erro:", error);
    }
  }

  return {
    ...context,
    certificates: createdCertificates,
  };
}

/**
 * Gera um código único para o certificado
 */
function generateCertificateCode(enrollment: any): string {
  const timestamp = new Date().getTime().toString().slice(-6);
  const userId = enrollment.userId.slice(0, 4);
  const courseId = enrollment.courseId.slice(0, 4);

  // Formato: CERT-AAAAMMDD-XXXX-YYYY-ZZZZZZ
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `CERT-${date}-${userId}-${courseId}-${timestamp}`;
}
