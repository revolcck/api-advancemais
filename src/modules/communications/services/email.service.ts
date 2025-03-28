import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";
import { brevoService } from "./brevo.service";
import { EmailOptions, EmailResponse } from "../dto/communications.dto";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { AuditService, AuditAction } from "@/shared/services/audit.service";

/**
 * Interface para representar um destinatário de email
 */
interface EmailRecipient {
  email: string;
  name?: string;
}

/**
 * Serviço para envio de emails através da plataforma Brevo
 */
export class EmailService {
  private static instance: EmailService;

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {}

  /**
   * Obtém a instância única do serviço de email
   */
  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Envia um email transacional utilizando a API da Brevo
   *
   * @param options Opções do email a ser enviado
   * @returns Objeto com informações do envio
   */
  public async sendEmail(options: EmailOptions): Promise<EmailResponse> {
    try {
      if (!brevoService.isAvailable()) {
        throw new ServiceUnavailableError(
          "Serviço de email não está disponível",
          "EMAIL_SERVICE_UNAVAILABLE"
        );
      }

      // Validações básicas
      if (!options.subject) {
        throw new ServiceUnavailableError(
          "Assunto do email é obrigatório",
          "EMAIL_SUBJECT_REQUIRED"
        );
      }

      if (!options.htmlContent && !options.textContent) {
        throw new ServiceUnavailableError(
          "Conteúdo do email é obrigatório (HTML ou texto)",
          "EMAIL_CONTENT_REQUIRED"
        );
      }

      if (!options.to) {
        throw new ServiceUnavailableError(
          "Destinatário do email é obrigatório",
          "EMAIL_RECIPIENT_REQUIRED"
        );
      }

      const emailApi = brevoService.getEmailApi();
      const sendSmtpEmail = brevoService.createEmailObject();

      // Configuração do email
      sendSmtpEmail.subject = options.subject;

      if (options.htmlContent) {
        sendSmtpEmail.htmlContent = options.htmlContent;
      }

      if (options.textContent) {
        sendSmtpEmail.textContent = options.textContent;
      }

      // Remetente
      sendSmtpEmail.sender = {
        name: options.senderName || env.brevo.senderName,
        email: options.senderEmail || env.brevo.senderEmail,
      };

      // Destinatários
      sendSmtpEmail.to = this.formatRecipients(options.to, options.toName);

      // Configurações adicionais opcionais
      if (options.replyTo) {
        sendSmtpEmail.replyTo = {
          email: options.replyTo,
          name: options.replyToName,
        };
      }

      if (options.cc) {
        sendSmtpEmail.cc = this.formatRecipients(options.cc);
      }

      if (options.bcc) {
        sendSmtpEmail.bcc = this.formatRecipients(options.bcc);
      }

      // Parâmetros dinâmicos para templates
      if (options.params) {
        sendSmtpEmail.params = options.params;
      }

      // Anexos
      if (options.attachments && options.attachments.length > 0) {
        sendSmtpEmail.attachment = options.attachments;
      }

      // Headers personalizados
      if (options.headers) {
        sendSmtpEmail.headers = options.headers;
      }

      // Envia o email através da API
      const result = await emailApi.sendTransacEmail(sendSmtpEmail);

      // Destinatários como string para logging
      const recipients = this.getRecipientsForLogging(sendSmtpEmail.to);

      // Registra o envio no log de auditoria
      AuditService.log(
        "email_sent",
        "communication",
        result.messageId,
        options.userId,
        {
          subject: options.subject,
          recipients,
          messageId: result.messageId,
        }
      );

      logger.info(`Email enviado com sucesso para ${recipients}`, {
        messageId: result.messageId,
        subject: options.subject,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error: unknown) {
      return this.handleEmailError(error, options);
    }
  }

  /**
   * Envia um email com template utilizando a API da Brevo
   *
   * @param templateId ID do template na plataforma Brevo
   * @param to Destinatário(s) do email
   * @param params Parâmetros para substituição no template
   * @param options Opções adicionais
   * @returns Objeto com informações do envio
   */
  public async sendTemplateEmail(
    templateId: number,
    to: string | Array<{ email: string; name?: string }>,
    params: Record<string, any>,
    options?: Partial<EmailOptions>
  ): Promise<EmailResponse> {
    try {
      if (!brevoService.isAvailable()) {
        throw new ServiceUnavailableError(
          "Serviço de email não está disponível",
          "EMAIL_SERVICE_UNAVAILABLE"
        );
      }

      // Validações básicas
      if (!templateId) {
        throw new ServiceUnavailableError(
          "ID do template é obrigatório",
          "EMAIL_TEMPLATE_ID_REQUIRED"
        );
      }

      if (!to) {
        throw new ServiceUnavailableError(
          "Destinatário do email é obrigatório",
          "EMAIL_RECIPIENT_REQUIRED"
        );
      }

      const emailApi = brevoService.getEmailApi();
      const sendSmtpEmail = brevoService.createEmailObject();

      // Configuração do template
      sendSmtpEmail.templateId = templateId;

      // Remetente
      sendSmtpEmail.sender = {
        name: options?.senderName || env.brevo.senderName,
        email: options?.senderEmail || env.brevo.senderEmail,
      };

      // Destinatários
      sendSmtpEmail.to = this.formatRecipients(to, options?.toName);

      // Parâmetros dinâmicos para o template
      sendSmtpEmail.params = params || {};

      // Configurações adicionais opcionais
      if (options?.replyTo) {
        sendSmtpEmail.replyTo = {
          email: options.replyTo,
          name: options.replyToName,
        };
      }

      if (options?.cc) {
        sendSmtpEmail.cc = this.formatRecipients(options.cc);
      }

      if (options?.bcc) {
        sendSmtpEmail.bcc = this.formatRecipients(options.bcc);
      }

      // Anexos
      if (options?.attachments && options.attachments.length > 0) {
        sendSmtpEmail.attachment = options.attachments;
      }

      // Headers personalizados
      if (options?.headers) {
        sendSmtpEmail.headers = options.headers;
      }

      // Envia o email através da API
      const result = await emailApi.sendTransacEmail(sendSmtpEmail);

      // Destinatários como string para logging
      const recipients = this.getRecipientsForLogging(sendSmtpEmail.to);

      // Registra o envio no log de auditoria
      AuditService.log(
        "email_template_sent",
        "communication",
        result.messageId,
        options?.userId,
        {
          templateId,
          recipients,
          messageId: result.messageId,
        }
      );

      logger.info(
        `Email com template ${templateId} enviado com sucesso para ${recipients}`,
        {
          messageId: result.messageId,
          templateId,
        }
      );

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error: unknown) {
      return this.handleEmailError(error, {
        templateId,
        to,
        params,
        ...options,
      });
    }
  }

  /**
   * Formata os destinatários para o formato esperado pela API da Brevo
   *
   * @param recipients Destinatários (string ou array de objetos)
   * @param defaultName Nome padrão quando recipients é uma string
   * @returns Array de destinatários no formato da API
   */
  private formatRecipients(
    recipients: string | Array<{ email: string; name?: string }>,
    defaultName?: string
  ): Array<{ email: string; name?: string }> {
    if (Array.isArray(recipients)) {
      return recipients;
    }

    return [{ email: recipients, name: defaultName }];
  }

  /**
   * Obtém os emails dos destinatários para fins de logging
   *
   * @param recipients Array de destinatários
   * @returns String com os emails separados por vírgula
   */
  private getRecipientsForLogging(recipients: EmailRecipient[]): string {
    return recipients.map((r) => r.email).join(", ");
  }

  /**
   * Trata erros de envio de email de forma consistente
   *
   * @param error Erro original
   * @param context Contexto do envio para incluir no log
   * @returns Objeto de resposta com informações do erro
   */
  private handleEmailError(error: unknown, context: any): EmailResponse {
    // Extrai informações do destinatário para o log
    const recipient =
      typeof context.to === "string"
        ? context.to
        : Array.isArray(context.to)
        ? this.getRecipientsForLogging(context.to)
        : "desconhecido";

    // Extrai descrição curta do tipo de email
    const emailType = context.templateId
      ? `template (ID: ${context.templateId})`
      : `"${context.subject || "sem assunto"}"`;

    // Log detalhado do erro
    logger.error(`Erro ao enviar email ${emailType} para ${recipient}`, error);

    // Trata erro da API da Brevo
    if (error && typeof error === "object" && "response" in error) {
      const apiError = error as { response?: { text?: string } };

      if (apiError.response?.text) {
        try {
          const parsedError = JSON.parse(apiError.response.text);
          return {
            success: false,
            error: parsedError.message || "Falha no envio de email",
            errorCode: parsedError.code || "EMAIL_SEND_FAILED",
          };
        } catch (parseError) {
          // Erro ao parsear a resposta
        }
      }
    }

    // Se for um erro já tratado do tipo ServiceUnavailableError
    if (error instanceof ServiceUnavailableError) {
      return {
        success: false,
        error: error.message,
        errorCode: error.errorCode,
      };
    }

    // Erro genérico
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha no envio de email",
      errorCode: "EMAIL_SEND_FAILED",
    };
  }
}

// Exporta uma instância do serviço
export const emailService = EmailService.getInstance();
