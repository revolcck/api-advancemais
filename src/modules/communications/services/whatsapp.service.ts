import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";
import { WhatsAppOptions, WhatsAppResponse } from "../dto/communications.dto";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { AuditService } from "@/shared/services/audit.service";
import axios from "axios";

/**
 * Interface para o payload da API de WhatsApp da Brevo
 */
interface WhatsAppPayload {
  content?: string;
  recipient: string;
  sender?: string;
  templateId?: number;
  params?: Record<string, string>;
  [key: string]: any;
}

/**
 * Serviço para envio de mensagens WhatsApp através da plataforma Brevo
 *
 * Nota: A API de WhatsApp da Brevo ainda não está completamente disponível no SDK.
 * Por isso, estamos usando requisições diretas à API REST.
 */
export class WhatsAppService {
  private static instance: WhatsAppService;
  private readonly baseUrl = "https://api.brevo.com/v3/whatsapp";
  private readonly apiKey: string;
  private readonly isEnabled: boolean;

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {
    this.apiKey = env.brevo.apiKey;
    this.isEnabled = Boolean(this.apiKey);

    if (!this.isEnabled) {
      logger.warn(
        "Serviço WhatsApp desabilitado - chave de API não configurada"
      );
    }
  }

  /**
   * Obtém a instância única do serviço de WhatsApp
   */
  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  /**
   * Envia uma mensagem de WhatsApp utilizando a API REST da Brevo
   *
   * @param options Opções da mensagem a ser enviada
   * @returns Objeto com informações do envio
   */
  public async sendWhatsAppMessage(
    options: WhatsAppOptions
  ): Promise<WhatsAppResponse> {
    try {
      if (!this.isEnabled) {
        throw new ServiceUnavailableError(
          "Serviço de WhatsApp não está configurado",
          "WHATSAPP_SERVICE_UNAVAILABLE"
        );
      }

      // Validações básicas
      if (!options.phoneNumber) {
        throw new ServiceUnavailableError(
          "Número de telefone é obrigatório",
          "WHATSAPP_PHONE_REQUIRED"
        );
      }

      if (!options.content && !options.templateId) {
        throw new ServiceUnavailableError(
          "Conteúdo ou ID do template é obrigatório",
          "WHATSAPP_CONTENT_REQUIRED"
        );
      }

      // Formata o número para garantir o padrão internacional
      const phoneNumber = this.formatPhoneNumber(options.phoneNumber);

      // Headers padrão para todas as requisições
      const headers = {
        "api-key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      // Construindo o payload para a API
      const payload: WhatsAppPayload = {
        recipient: phoneNumber,
        sender: options.sender,
      };

      // Adiciona conteúdo ou templateId conforme fornecido
      if (options.content) {
        payload.content = options.content;
      }

      if (options.templateId) {
        payload.templateId = options.templateId;

        if (options.params) {
          payload.params = options.params;
        }
      }

      // Fazendo a chamada para a API do Brevo
      const response = await axios.post(`${this.baseUrl}/message`, payload, {
        headers,
      });

      // Registra o envio no log de auditoria
      AuditService.log(
        "whatsapp_sent",
        "communication",
        response.data.messageId,
        options.userId,
        {
          phoneNumber: this.maskPhoneNumber(phoneNumber),
          messageId: response.data.messageId,
          templateId: options.templateId,
        }
      );

      logger.info(
        `Mensagem WhatsApp enviada com sucesso para ${this.maskPhoneNumber(
          phoneNumber
        )}`,
        {
          messageId: response.data.messageId,
          templateId: options.templateId,
        }
      );

      return {
        success: true,
        messageId: response.data.messageId,
        data: response.data,
      };
    } catch (error: unknown) {
      return this.handleWhatsAppError(error, options);
    }
  }

  /**
   * Envia uma mensagem de WhatsApp usando um template da Brevo
   *
   * @param phoneNumber Número de telefone do destinatário
   * @param templateId ID do template na plataforma Brevo
   * @param params Parâmetros a serem substituídos no template
   * @param options Opções adicionais
   * @returns Objeto com informações do envio
   */
  public async sendWhatsAppTemplate(
    phoneNumber: string,
    templateId: number,
    params: Record<string, string>,
    options?: Partial<WhatsAppOptions>
  ): Promise<WhatsAppResponse> {
    try {
      // Validações básicas
      if (!phoneNumber) {
        throw new ServiceUnavailableError(
          "Número de telefone é obrigatório",
          "WHATSAPP_PHONE_REQUIRED"
        );
      }

      if (!templateId) {
        throw new ServiceUnavailableError(
          "ID do template é obrigatório",
          "WHATSAPP_TEMPLATE_ID_REQUIRED"
        );
      }

      // Cria as opções completas para o envio
      const whatsappOptions: WhatsAppOptions = {
        phoneNumber,
        templateId,
        params,
        sender: options?.sender,
        userId: options?.userId,
      };

      // Usa o método principal para enviar a mensagem
      return await this.sendWhatsAppMessage(whatsappOptions);
    } catch (error: unknown) {
      return this.handleWhatsAppError(error, {
        phoneNumber,
        templateId,
        params,
        ...options,
      });
    }
  }

  /**
   * Obtém a lista de templates WhatsApp disponíveis na conta Brevo
   * @returns Lista de templates
   */
  public async getWhatsAppTemplates(): Promise<any> {
    try {
      if (!this.isEnabled) {
        throw new ServiceUnavailableError(
          "Serviço de WhatsApp não está configurado",
          "WHATSAPP_SERVICE_UNAVAILABLE"
        );
      }

      const headers = {
        "api-key": this.apiKey,
        Accept: "application/json",
      };

      const response = await axios.get(`${this.baseUrl}/templates`, {
        headers,
      });

      logger.info(
        `Templates WhatsApp obtidos com sucesso: ${response.data.count} templates`
      );

      return {
        success: true,
        templates: response.data.templates || [],
        count: response.data.count || 0,
      };
    } catch (error: unknown) {
      logger.error("Erro ao obter templates WhatsApp", error);

      // Trata erro da API
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: {
            data?: any;
            status?: number;
          };
        };

        if (axiosError.response?.data) {
          const errorData = axiosError.response.data;

          return {
            success: false,
            error: errorData.message || "Falha ao obter templates WhatsApp",
            errorCode: errorData.code || "WHATSAPP_TEMPLATES_FAILED",
            status: axiosError.response.status,
          };
        }
      }

      // Se for um erro já tratado
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
        error:
          error instanceof Error
            ? error.message
            : "Falha ao obter templates WhatsApp",
        errorCode: "WHATSAPP_TEMPLATES_FAILED",
      };
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
   * Trata erros de envio de WhatsApp de forma consistente
   *
   * @param error Erro original
   * @param context Contexto do envio para incluir no log
   * @returns Objeto de resposta com informações do erro
   */
  private handleWhatsAppError(error: unknown, context: any): WhatsAppResponse {
    // Extrai informações do destinatário para o log
    const phoneNumber = context.phoneNumber || "desconhecido";
    const maskedPhone = this.maskPhoneNumber(phoneNumber);

    // Extrai descrição curta do tipo de mensagem
    const messageType = context.templateId
      ? `template (ID: ${context.templateId})`
      : "direta";

    // Log detalhado do erro
    logger.error(
      `Erro ao enviar mensagem WhatsApp ${messageType} para ${maskedPhone}`,
      error
    );

    // Trata erro da API com axios
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as {
        response?: {
          data?: any;
          status?: number;
        };
      };

      if (axiosError.response?.data) {
        const errorData = axiosError.response.data;

        return {
          success: false,
          error: errorData.message || "Falha no envio de mensagem WhatsApp",
          errorCode: errorData.code || "WHATSAPP_SEND_FAILED",
          status: axiosError.response.status,
        };
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
      error:
        error instanceof Error
          ? error.message
          : "Falha no envio de mensagem WhatsApp",
      errorCode: "WHATSAPP_SEND_FAILED",
    };
  }
}

// Exporta uma instância do serviço
export const whatsAppService = WhatsAppService.getInstance();
