// src/modules/communications/services/whatsapp.service.ts

import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";
import { WhatsAppOptions } from "../dto/communications.dto";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
// axios precisa ser instalado: pnpm add axios
import axios from "axios";

/**
 * Interface para o payload da API de WhatsApp
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
  private readonly apiUrl = "https://api.brevo.com/v3/whatsapp";

  /**
   * Construtor privado para singleton
   */
  private constructor() {}

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
  public async sendWhatsAppMessage(options: WhatsAppOptions): Promise<any> {
    try {
      const headers = {
        "api-key": env.brevo.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      // Construindo o payload para a API
      const payload: WhatsAppPayload = {
        content: options.content,
        recipient: options.phoneNumber.replace(/[^0-9+]/g, ""), // Garantindo formato correto
        sender: options.sender || undefined,
        templateId: options.templateId || undefined,
        params: options.params || undefined,
      };

      // Removendo campos undefined
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      // Fazendo a chamada para a API do Brevo
      const response = await axios.post(this.apiUrl + "/message", payload, {
        headers,
      });

      logger.info(
        `Mensagem WhatsApp enviada com sucesso para ${options.phoneNumber}`,
        {
          messageId: response.data.messageId,
        }
      );

      return {
        success: true,
        messageId: response.data.messageId,
        data: response.data,
      };
    } catch (error: unknown) {
      logger.error(
        `Erro ao enviar mensagem WhatsApp para ${options.phoneNumber}`,
        error
      );

      // Tratamento específico para erros da API
      if (typeof error === "object" && error !== null && "response" in error) {
        const apiError = error as {
          response?: {
            data?: any;
          };
        };

        if (apiError.response?.data) {
          const errorData = apiError.response.data;
          throw new ServiceUnavailableError(
            `Falha no envio de mensagem WhatsApp: ${
              errorData.message || "Erro no serviço de WhatsApp"
            }`,
            "WHATSAPP_SEND_FAILED",
            { code: errorData.code }
          );
        }
      }

      // Erro genérico
      throw new ServiceUnavailableError(
        "Falha no envio de mensagem WhatsApp",
        "WHATSAPP_SEND_FAILED"
      );
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
  ): Promise<any> {
    try {
      const whatsappOptions: WhatsAppOptions = {
        phoneNumber,
        templateId,
        params,
        sender: options?.sender,
      };

      return await this.sendWhatsAppMessage(whatsappOptions);
    } catch (error: unknown) {
      logger.error(
        `Erro ao enviar template WhatsApp ${templateId} para ${phoneNumber}`,
        error
      );

      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      throw new ServiceUnavailableError(
        `Falha no envio de template WhatsApp ${templateId}`,
        "WHATSAPP_TEMPLATE_FAILED"
      );
    }
  }

  /**
   * Obtém a lista de templates WhatsApp disponíveis
   * @returns Lista de templates
   */
  public async getWhatsAppTemplates(): Promise<any> {
    try {
      const headers = {
        "api-key": env.brevo.apiKey,
        Accept: "application/json",
      };

      const response = await axios.get(this.apiUrl + "/templates", { headers });

      logger.info(
        `Templates WhatsApp obtidos com sucesso: ${response.data.count} templates`
      );

      return response.data;
    } catch (error: unknown) {
      logger.error("Erro ao obter templates WhatsApp", error);

      // Tratamento específico para erros da API
      if (typeof error === "object" && error !== null && "response" in error) {
        const apiError = error as {
          response?: {
            data?: any;
          };
        };

        if (apiError.response?.data) {
          const errorData = apiError.response.data;
          throw new ServiceUnavailableError(
            `Falha ao obter templates WhatsApp: ${
              errorData.message || "Erro no serviço de WhatsApp"
            }`,
            "WHATSAPP_TEMPLATES_FAILED",
            { code: errorData.code }
          );
        }
      }

      // Erro genérico
      throw new ServiceUnavailableError(
        "Falha ao obter templates WhatsApp",
        "WHATSAPP_TEMPLATES_FAILED"
      );
    }
  }
}

// Exporta uma instância do serviço
export const whatsAppService = WhatsAppService.getInstance();
