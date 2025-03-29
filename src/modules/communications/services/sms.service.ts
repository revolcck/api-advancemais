import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";
import { brevoService } from "./brevo.service";
import { SmsOptions, SmsResponse } from "../dtos/communications.dto";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { AuditService } from "@/shared/services/audit.service";

/**
 * Serviço para envio de SMS através da plataforma Brevo
 */
export class SmsService {
  private static instance: SmsService;

  /**
   * Construtor privado para implementar o padrão Singleton
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
  public async sendSms(options: SmsOptions): Promise<SmsResponse> {
    try {
      if (!brevoService.isAvailable()) {
        throw new ServiceUnavailableError(
          "Serviço de SMS não está disponível",
          "SMS_SERVICE_UNAVAILABLE"
        );
      }

      // Validações básicas
      if (!options.phoneNumber) {
        throw new ServiceUnavailableError(
          "Número de telefone é obrigatório",
          "SMS_PHONE_REQUIRED"
        );
      }

      if (!options.content) {
        throw new ServiceUnavailableError(
          "Conteúdo do SMS é obrigatório",
          "SMS_CONTENT_REQUIRED"
        );
      }

      // Formata o número para garantir o padrão internacional
      const phoneNumber = this.formatPhoneNumber(options.phoneNumber);

      const smsApi = brevoService.getSmsApi();
      const sendTransacSms = brevoService.createSmsObject();

      // Configuração do SMS
      sendTransacSms.content = options.content;
      sendTransacSms.recipient = phoneNumber;
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

      // Registra o envio no log de auditoria
      AuditService.log(
        "sms_sent",
        "communication",
        result.messageId,
        options.userId,
        {
          phoneNumber: this.maskPhoneNumber(phoneNumber),
          messageId: result.messageId,
          remainingCredits: result.remainingCredits,
        }
      );

      logger.info(
        `SMS enviado com sucesso para ${this.maskPhoneNumber(phoneNumber)}`,
        {
          messageId: result.messageId,
          remainingCredits: result.remainingCredits,
        }
      );

      return {
        success: true,
        messageId: result.messageId,
        remainingCredits: result.remainingCredits,
      };
    } catch (error: unknown) {
      return this.handleSmsError(error, options);
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
  ): Promise<SmsResponse> {
    try {
      if (!brevoService.isAvailable()) {
        throw new ServiceUnavailableError(
          "Serviço de SMS não está disponível",
          "SMS_SERVICE_UNAVAILABLE"
        );
      }

      // Validações básicas
      if (!phoneNumber) {
        throw new ServiceUnavailableError(
          "Número de telefone é obrigatório",
          "SMS_PHONE_REQUIRED"
        );
      }

      if (!templateContent) {
        throw new ServiceUnavailableError(
          "Conteúdo do template é obrigatório",
          "SMS_TEMPLATE_CONTENT_REQUIRED"
        );
      }

      // Processa o template substituindo os parâmetros
      let content = templateContent;

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          content = content.replace(new RegExp(`{${key}}`, "g"), value);
        });
      }

      // Prepara as opções do SMS
      const smsOptions: SmsOptions = {
        phoneNumber,
        content,
        sender: options?.sender || env.brevo.smsSender,
        type: options?.type,
        tag: options?.tag,
        webUrl: options?.webUrl,
        userId: options?.userId,
      };

      // Envia o SMS usando o método principal
      return await this.sendSms(smsOptions);
    } catch (error: unknown) {
      return this.handleSmsError(error, {
        phoneNumber,
        templateContent,
        params,
        ...options,
      });
    }
  }

  /**
   * Formata o número de telefone para o padrão internacional
   * Garante que o número comece com + e contenha apenas dígitos e o sinal de +
   *
   * @param phoneNumber Número de telefone a ser formatado
   * @returns Número de telefone formatado
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove todos os caracteres não numéricos, exceto o +
    const cleaned = phoneNumber.replace(/[^\d+]/g, "");

    // Garante que comece com +
    if (!cleaned.startsWith("+")) {
      return `+${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Mascara parte do número de telefone para fins de logging
   * Ex: +5511999999999 se torna +5511****9999
   *
   * @param phoneNumber Número de telefone completo
   * @returns Número de telefone parcialmente mascarado
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 8) {
      return phoneNumber; // Número muito curto, não mascara
    }

    // Mantém o código do país e os primeiros dígitos, mascara o meio, mantém os últimos 4
    const start = phoneNumber.substring(0, Math.min(5, phoneNumber.length - 4));
    const end = phoneNumber.substring(phoneNumber.length - 4);
    const maskedPart = "*".repeat(
      Math.max(0, phoneNumber.length - start.length - end.length)
    );

    return `${start}${maskedPart}${end}`;
  }

  /**
   * Trata erros de envio de SMS de forma consistente
   *
   * @param error Erro original
   * @param context Contexto do envio para incluir no log
   * @returns Objeto de resposta com informações do erro
   */
  private handleSmsError(error: unknown, context: any): SmsResponse {
    // Extrai informações do destinatário para o log
    const phoneNumber = context.phoneNumber || "desconhecido";
    const maskedPhone = this.maskPhoneNumber(phoneNumber);

    // Log detalhado do erro
    logger.error(`Erro ao enviar SMS para ${maskedPhone}`, error);

    // Trata erro da API da Brevo
    if (error && typeof error === "object" && "response" in error) {
      const apiError = error as { response?: { text?: string } };

      if (apiError.response?.text) {
        try {
          const parsedError = JSON.parse(apiError.response.text);
          return {
            success: false,
            error: parsedError.message || "Falha no envio de SMS",
            errorCode: parsedError.code || "SMS_SEND_FAILED",
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
      error: error instanceof Error ? error.message : "Falha no envio de SMS",
      errorCode: "SMS_SEND_FAILED",
    };
  }
}

// Exporta uma instância do serviço
export const smsService = SmsService.getInstance();
