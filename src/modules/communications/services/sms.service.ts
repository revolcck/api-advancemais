// src/modules/communications/services/sms.service.ts

import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";
import { brevoService } from "./brevo.service";
import { SmsOptions } from "../dto/communications.dto";
import { ServiceUnavailableError } from "@/shared/errors/AppError";

/**
 * Serviço para envio de SMS através da plataforma Brevo
 */
export class SmsService {
  private static instance: SmsService;

  /**
   * Construtor privado para singleton
   */
  private constructor() {}

  /**
   * Obtém a instância única do serviço de SMS
   */
  public static getInstance(): SmsService {
    if (!SmsService.instance) {
      SmsService.instance = new SmsService();
    }
    return SmsService.instance;
  }

  /**
   * Envia um SMS transacional utilizando a API da Brevo
   *
   * @param options Opções do SMS a ser enviado
   * @returns Objeto com informações do envio
   */
  public async sendSms(options: SmsOptions): Promise<any> {
    try {
      const smsApi = brevoService.getSmsApi();
      const sendTransacSms = brevoService.createSmsObject();

      // Configuração do SMS
      sendTransacSms.content = options.content;
      sendTransacSms.recipient = options.phoneNumber;
      sendTransacSms.sender = options.sender || env.brevo.smsSender;

      // Configurações opcionais
      if (options.type) {
        sendTransacSms.type = options.type;
      }

      if (options.tag) {
        sendTransacSms.tag = options.tag;
      }

      if (options.webUrl) {
        sendTransacSms.webUrl = options.webUrl;
      }

      // Envia o SMS através da API
      const result = await smsApi.sendTransacSms(sendTransacSms);

      logger.info(`SMS enviado com sucesso para ${options.phoneNumber}`, {
        messageId: result.messageId,
        remainingCredits: result.remainingCredits,
      });

      return {
        success: true,
        messageId: result.messageId,
        remainingCredits: result.remainingCredits,
      };
    } catch (error: unknown) {
      logger.error(`Erro ao enviar SMS para ${options.phoneNumber}`, error);

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
              `Falha no envio de SMS: ${
                parsedError.message || "Erro no serviço de SMS"
              }`,
              "SMS_SEND_FAILED",
              { code: parsedError.code }
            );
          } catch (parseError) {
            // Se não conseguir parsear o erro
            throw new ServiceUnavailableError(
              "Falha no envio de SMS",
              "SMS_SEND_FAILED"
            );
          }
        }
      }

      // Erro genérico
      throw new ServiceUnavailableError(
        "Falha no envio de SMS",
        "SMS_SEND_FAILED"
      );
    }
  }

  /**
   * Envia um SMS usando um modelo de template com parâmetros
   *
   * @param phoneNumber Número de telefone do destinatário
   * @param templateContent Conteúdo do template com placeholders {param}
   * @param params Objeto com os parâmetros para substituição no template
   * @param options Opções adicionais
   * @returns Objeto com informações do envio
   */
  public async sendTemplateSms(
    phoneNumber: string,
    templateContent: string,
    params: Record<string, string>,
    options?: Partial<SmsOptions>
  ): Promise<any> {
    try {
      // Processa o template substituindo os parâmetros
      let content = templateContent;
      Object.entries(params).forEach(([key, value]) => {
        content = content.replace(new RegExp(`{${key}}`, "g"), value);
      });

      // Prepara as opções do SMS
      const smsOptions: SmsOptions = {
        phoneNumber,
        content,
        sender: options?.sender || env.brevo.smsSender,
        type: options?.type,
        tag: options?.tag,
        webUrl: options?.webUrl,
      };

      // Envia o SMS usando o método principal
      return await this.sendSms(smsOptions);
    } catch (error: unknown) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      logger.error(
        `Erro ao processar template de SMS para ${phoneNumber}`,
        error
      );
      throw new ServiceUnavailableError(
        "Falha no processamento do template de SMS",
        "SMS_TEMPLATE_FAILED"
      );
    }
  }
}

// Exporta uma instância do serviço
export const smsService = SmsService.getInstance();
