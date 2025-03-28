// src/modules/communications/services/email.service.ts

import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";
import { brevoService } from "./brevo.service";
import { EmailOptions } from "../dto/communications.dto";
import { ServiceUnavailableError } from "@/shared/errors/AppError";

// Interface para o objeto de e-mail
interface EmailRecipient {
  email: string;
  name?: string;
}

/**
 * Serviço para envio de e-mails através da plataforma Brevo
 */
export class EmailService {
  private static instance: EmailService;

  /**
   * Construtor privado para singleton
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
   * Envia um e-mail transacional utilizando a API da Brevo
   *
   * @param options Opções do e-mail a ser enviado
   * @returns Objeto com informações do envio
   */
  public async sendEmail(options: EmailOptions): Promise<any> {
    try {
      const emailApi = brevoService.getEmailApi();
      const sendSmtpEmail = brevoService.createEmailObject();

      // Configuração do e-mail
      sendSmtpEmail.subject = options.subject;
      sendSmtpEmail.htmlContent = options.htmlContent;
      sendSmtpEmail.textContent = options.textContent;

      // Remetente
      sendSmtpEmail.sender = {
        name: options.senderName || env.brevo.senderName,
        email: options.senderEmail || env.brevo.senderEmail,
      };

      // Destinatários
      sendSmtpEmail.to = Array.isArray(options.to)
        ? options.to
        : [{ email: options.to, name: options.toName }];

      // Configurações adicionais opcionais
      if (options.replyTo) {
        sendSmtpEmail.replyTo = {
          email: options.replyTo,
          name: options.replyToName,
        };
      }

      if (options.cc) {
        sendSmtpEmail.cc = Array.isArray(options.cc)
          ? options.cc
          : [{ email: options.cc }];
      }

      if (options.bcc) {
        sendSmtpEmail.bcc = Array.isArray(options.bcc)
          ? options.bcc
          : [{ email: options.bcc }];
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

      // Envia o e-mail através da API
      const result = await emailApi.sendTransacEmail(sendSmtpEmail);

      // Destinatários como string para logging
      const recipients = sendSmtpEmail.to
        .map((r: EmailRecipient) => r.email)
        .join(", ");

      logger.info(`E-mail enviado com sucesso para ${options.to}`, {
        messageId: result.messageId,
        subject: options.subject,
        recipients,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error: unknown) {
      logger.error(`Erro ao enviar e-mail para ${options.to}`, error);

      // Tratamento específico para erros da API da Brevo
      if (typeof error === "object" && error !== null && "response" in error) {
        const apiError = error as {
          response?: {
            text?: string;
          };
        };

        if (apiError.response?.text) {
          try {
            const parsedError = JSON.parse(apiError.response.text);
            throw new ServiceUnavailableError(
              `Falha no envio de e-mail: ${
                parsedError.message || "Erro no serviço de e-mail"
              }`,
              "EMAIL_SEND_FAILED",
              { code: parsedError.code }
            );
          } catch (parseError) {
            // Se não conseguir parsear o erro
            throw new ServiceUnavailableError(
              "Falha no envio de e-mail",
              "EMAIL_SEND_FAILED"
            );
          }
        }
      }

      // Erro genérico
      throw new ServiceUnavailableError(
        "Falha no envio de e-mail",
        "EMAIL_SEND_FAILED"
      );
    }
  }

  /**
   * Envia um e-mail com template utilizando a API da Brevo
   *
   * @param templateId ID do template na plataforma Brevo
   * @param to Destinatário(s) do e-mail
   * @param params Parâmetros para substituição no template
   * @param options Opções adicionais
   * @returns Objeto com informações do envio
   */
  public async sendTemplateEmail(
    templateId: number,
    to: string | Array<{ email: string; name?: string }>,
    params: Record<string, any>,
    options?: Partial<EmailOptions>
  ): Promise<any> {
    try {
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
      sendSmtpEmail.to = Array.isArray(to)
        ? to
        : [{ email: to, name: options?.toName }];

      // Parâmetros dinâmicos para o template
      sendSmtpEmail.params = params;

      // Configurações adicionais opcionais
      if (options?.replyTo) {
        sendSmtpEmail.replyTo = {
          email: options.replyTo,
          name: options.replyToName,
        };
      }

      if (options?.cc) {
        sendSmtpEmail.cc = Array.isArray(options.cc)
          ? options.cc
          : [{ email: options.cc }];
      }

      if (options?.bcc) {
        sendSmtpEmail.bcc = Array.isArray(options.bcc)
          ? options.bcc
          : [{ email: options.bcc }];
      }

      // Anexos
      if (options?.attachments && options.attachments.length > 0) {
        sendSmtpEmail.attachment = options.attachments;
      }

      // Headers personalizados
      if (options?.headers) {
        sendSmtpEmail.headers = options.headers;
      }

      // Envia o e-mail através da API
      const result = await emailApi.sendTransacEmail(sendSmtpEmail);

      // Destinatários como string para logging
      const recipients = sendSmtpEmail.to
        .map((r: EmailRecipient) => r.email)
        .join(", ");

      logger.info(`E-mail com template ${templateId} enviado com sucesso`, {
        messageId: result.messageId,
        templateId,
        recipients,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error: unknown) {
      logger.error(`Erro ao enviar e-mail com template ${templateId}`, error);

      // Tratamento específico para erros da API da Brevo
      if (typeof error === "object" && error !== null && "response" in error) {
        const apiError = error as {
          response?: {
            text?: string;
          };
        };

        if (apiError.response?.text) {
          try {
            const parsedError = JSON.parse(apiError.response.text);
            throw new ServiceUnavailableError(
              `Falha no envio de e-mail com template: ${
                parsedError.message || "Erro no serviço de e-mail"
              }`,
              "EMAIL_TEMPLATE_SEND_FAILED",
              { code: parsedError.code, templateId }
            );
          } catch (parseError) {
            // Se não conseguir parsear o erro
            throw new ServiceUnavailableError(
              `Falha no envio de e-mail com template ${templateId}`,
              "EMAIL_TEMPLATE_SEND_FAILED"
            );
          }
        }
      }

      // Erro genérico
      throw new ServiceUnavailableError(
        `Falha no envio de e-mail com template ${templateId}`,
        "EMAIL_TEMPLATE_SEND_FAILED"
      );
    }
  }
}

// Exporta uma instância do serviço
export const emailService = EmailService.getInstance();
