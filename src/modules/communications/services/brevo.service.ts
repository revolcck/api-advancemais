// src/modules/communications/services/brevo.service.ts

import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";
import { InternalServerError } from "@/shared/errors/AppError";
import axios from "axios";

/**
 * Serviço base para comunicação com a API da Brevo
 * Esta implementação usa axios diretamente para APIs REST em vez de depender do SDK
 */
export class BrevoService {
  private static instance: BrevoService;
  private apiKey: string;
  private baseUrl: string = "https://api.brevo.com/v3";
  private initialized: boolean = false;

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {
    try {
      // Obtém a chave de API das variáveis de ambiente
      this.apiKey = env.brevo.apiKey;

      // Valida se a chave de API foi fornecida
      if (!this.apiKey) {
        throw new Error("Chave de API da Brevo não configurada");
      }

      this.initialized = true;
      logger.info("Serviço Brevo inicializado com sucesso");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        `Falha ao inicializar serviço Brevo: ${errorMessage}`,
        error
      );
      this.initialized = false;

      // Em desenvolvimento, não interrompemos a inicialização da aplicação
      if (env.isProduction) {
        throw new InternalServerError(
          "Falha ao inicializar serviço de comunicações",
          "BREVO_INIT_FAILED"
        );
      }
    }
  }

  /**
   * Obtém a instância única do serviço Brevo
   */
  public static getInstance(): BrevoService {
    if (!BrevoService.instance) {
      BrevoService.instance = new BrevoService();
    }
    return BrevoService.instance;
  }

  /**
   * Obtém o cliente axios configurado com cabeçalhos de autenticação
   */
  private getClient() {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        "api-key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  /**
   * Verifica se o serviço está inicializado
   * @throws Error se o serviço não estiver inicializado
   */
  private checkInitialization(): void {
    if (!this.initialized) {
      const error = new InternalServerError(
        "Serviço de comunicações não está disponível",
        "BREVO_SERVICE_UNAVAILABLE"
      );
      logger.error(
        "Tentativa de acessar serviço Brevo não inicializado",
        error
      );
      throw error;
    }
  }

  /**
   * Obtém informações da conta Brevo
   * Útil para testes de conectividade e health checks
   */
  public async getAccountInfo(): Promise<any> {
    this.checkInitialization();

    try {
      const response = await this.getClient().get("/account");
      logger.debug("Informações da conta Brevo obtidas com sucesso");
      return response.data;
    } catch (error) {
      logger.error("Erro ao obter informações da conta Brevo", error);
      throw this.handleAxiosError(
        error,
        "Falha ao verificar conectividade com a Brevo"
      );
    }
  }

  /**
   * Envia um email transacional
   *
   * @param emailData Dados do email a ser enviado
   * @returns Objeto com informações do envio
   */
  public async sendEmail(emailData: any): Promise<any> {
    this.checkInitialization();

    try {
      const response = await this.getClient().post("/smtp/email", emailData);
      return response.data;
    } catch (error) {
      logger.error("Erro ao enviar email transacional", error);
      throw this.handleAxiosError(error, "Falha ao enviar email");
    }
  }

  /**
   * Envia um SMS transacional
   *
   * @param smsData Dados do SMS a ser enviado
   * @returns Objeto com informações do envio
   */
  public async sendSms(smsData: any): Promise<any> {
    this.checkInitialization();

    try {
      const response = await this.getClient().post(
        "/transactionalSMS/sms",
        smsData
      );
      return response.data;
    } catch (error) {
      logger.error("Erro ao enviar SMS transacional", error);
      throw this.handleAxiosError(error, "Falha ao enviar SMS");
    }
  }

  /**
   * Envia uma mensagem de WhatsApp
   *
   * @param whatsappData Dados da mensagem WhatsApp a ser enviada
   * @returns Objeto com informações do envio
   */
  public async sendWhatsAppMessage(whatsappData: any): Promise<any> {
    this.checkInitialization();

    try {
      const response = await this.getClient().post(
        "/whatsapp/message",
        whatsappData
      );
      return response.data;
    } catch (error) {
      logger.error("Erro ao enviar mensagem WhatsApp", error);
      throw this.handleAxiosError(error, "Falha ao enviar mensagem WhatsApp");
    }
  }

  /**
   * Obtém os templates de WhatsApp disponíveis
   *
   * @returns Lista de templates
   */
  public async getWhatsAppTemplates(): Promise<any> {
    this.checkInitialization();

    try {
      const response = await this.getClient().get("/whatsapp/templates");
      return response.data;
    } catch (error) {
      logger.error("Erro ao obter templates de WhatsApp", error);
      throw this.handleAxiosError(
        error,
        "Falha ao obter templates de WhatsApp"
      );
    }
  }

  /**
   * Manipula erros da API da Brevo de forma consistente
   * @param error Erro original
   * @param defaultMessage Mensagem padrão caso não seja possível extrair do erro
   * @returns Erro tratado
   */
  private handleAxiosError(error: any, defaultMessage: string): Error {
    if (axios.isAxiosError(error) && error.response) {
      // Erro com resposta da API
      const statusCode = error.response.status;
      const responseData = error.response.data;

      return new InternalServerError(
        responseData?.message || defaultMessage,
        responseData?.code || `BREVO_API_ERROR_${statusCode}`,
        {
          statusCode,
          originalError: responseData,
        }
      );
    }

    // Erro de rede ou outro tipo
    return new InternalServerError(
      error?.message || defaultMessage,
      "BREVO_API_ERROR",
      { originalError: error }
    );
  }

  /**
   * Verifica se a API está disponível
   * @returns true se a API estiver disponível
   */
  public isAvailable(): boolean {
    return this.initialized;
  }

  /**
   * Cria um objeto de email para a API da Brevo
   * Simplificação para compatibilidade com o serviço original
   */
  public createEmailObject(): any {
    return {};
  }

  /**
   * Cria um objeto de SMS para a API da Brevo
   * Simplificação para compatibilidade com o serviço original
   */
  public createSmsObject(): any {
    return {};
  }

  /**
   * Obtém a API de email transacional
   * Este método existe apenas para manter compatibilidade com a interface anterior
   */
  public getEmailApi(): any {
    return {
      sendTransacEmail: async (emailData: any) => {
        return await this.sendEmail(emailData);
      },
    };
  }

  /**
   * Obtém a API de SMS transacional
   * Este método existe apenas para manter compatibilidade com a interface anterior
   */
  public getSmsApi(): any {
    return {
      sendTransacSms: async (smsData: any) => {
        return await this.sendSms(smsData);
      },
    };
  }

  /**
   * Obtém a API de contatos
   * Este método existe apenas para manter compatibilidade com a interface anterior
   */
  public getContactsApi(): any {
    return {
      getAttributes: async () => {
        try {
          const response = await this.getClient().get("/contacts/attributes");
          return response.data;
        } catch (error) {
          throw this.handleAxiosError(
            error,
            "Falha ao obter atributos de contatos"
          );
        }
      },
    };
  }

  /**
   * Obtém a API de conta
   * Este método existe apenas para manter compatibilidade com a interface anterior
   */
  public getAccountApi(): any {
    return {
      getAccount: async () => {
        return await this.getAccountInfo();
      },
    };
  }
}

// Exporta uma instância singleton do serviço
export const brevoService = BrevoService.getInstance();
