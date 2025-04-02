import { Enrollment } from "@prisma/client";
import { StringUtils } from "./StringUtils";

/**
 * Utilitários para a geração de códigos únicos
 */
export const CodeGenerator = {
  /**
   * Gera um código único para certificado baseado em dados da matrícula
   * @param enrollment Matrícula do aluno
   * @param prefix Prefixo para o código (padrão: CERT)
   * @returns Código único no formato PREFIX-AAAAMMDD-XXXX-YYYY-ZZZZZZ
   */
  generateCertificateCode(
    enrollment: Enrollment,
    prefix: string = "CERT"
  ): string {
    // Extrai partes para compor o código
    const timestamp = new Date().getTime().toString().slice(-6);
    const userId = enrollment.userId.slice(0, 4);
    const courseId = enrollment.courseId.slice(0, 4);
    const dateStr = StringUtils.formatDateYYYYMMDD();

    // Formato: CERT-AAAAMMDD-XXXX-YYYY-ZZZZZZ
    return `${prefix}-${dateStr}-${userId}-${courseId}-${timestamp}`;
  },

  /**
   * Gera um código de rastreamento aleatório para diversos fins
   * @param prefix Prefixo do código (padrão: TRK)
   * @param length Tamanho do código (padrão: 10)
   * @returns Código alfanumérico único
   */
  generateTrackingCode(prefix: string = "TRK", length: number = 10): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${prefix}-${result}`;
  },

  /**
   * Gera um código para vaga (formato JOB-AAAAMMDD-XXXX)
   * @param companyId ID da empresa (usado para tornar o código único)
   * @returns Código único para vaga
   */
  generateJobCode(companyId: string): string {
    const companyPart = companyId.slice(0, 4).toUpperCase();
    const dateStr = StringUtils.formatDateYYYYMMDD();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");

    return `JOB-${dateStr}-${companyPart}-${random}`;
  },

  /**
   * Gera uma matrícula única para usuário (formato AA999ZZ)
   * @param userType Tipo de usuário (PF ou PJ)
   * @returns Código de matrícula único
   */
  generateMatricula(userType: "PESSOA_FISICA" | "PESSOA_JURIDICA"): string {
    const prefix = userType === "PESSOA_FISICA" ? "PF" : "PJ";
    const numeric = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const suffix =
      alpha.charAt(Math.floor(Math.random() * alpha.length)) +
      alpha.charAt(Math.floor(Math.random() * alpha.length));

    return `${prefix}${numeric}${suffix}`;
  },

  /**
   * Gera um código de cupom formatado
   * @param campaign Nome da campanha (ex: BLACKFRIDAY)
   * @param discount Valor do desconto
   * @returns Código do cupom (ex: BLACK25)
   */
  generateCouponCode(campaign: string, discount: number): string {
    // Pega apenas as primeiras 5 letras da campanha
    const campaignPart = StringUtils.alphanumeric(campaign)
      .slice(0, 5)
      .toUpperCase();
    // Arredonda o desconto para número inteiro
    const discountPart = Math.round(discount).toString();

    return `${campaignPart}${discountPart}`;
  },

  /**
   * Gera um UUID v4 simples
   * @returns UUID v4
   */
  generateUuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  },
};
