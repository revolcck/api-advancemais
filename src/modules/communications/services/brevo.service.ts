// src/modules/communications/services/brevo.service.ts

import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";

// Importação com require por causa de problemas de tipagem com o SDK
// eslint-disable-next-line @typescript-eslint/no-var-requires
const brevo = require("@getbrevo/brevo");

/**
 * Serviço de base para comunicação com a API da Brevo (Sendinblue)
 * Fornece acesso às APIs para e-mail, SMS e WhatsApp
 */
export class BrevoService {
  private static instance: BrevoService;
  private defaultClient: any;
  private apiKey: string;
  private initialized: boolean = false;

  // APIs específicas
  private emailApi: any;
  private smsApi: any;
  private whatsappApi: any;
  private contactsApi: any;

  /**
   * Construtor privado para singleton
   */
  private constructor() {
    // Inicializa o cliente API default
    this.defaultClient = brevo.ApiClient.instance;
    this.apiKey = env.brevo.apiKey;

    // Define a chave de API para autenticação
    this.defaultClient.authentications["api-key"].apiKey = this.apiKey;

    // Inicializa as APIs específicas
    this.emailApi = new brevo.TransactionalEmailsApi();
    this.smsApi = new brevo.TransactionalSMSApi();
    this.contactsApi = new brevo.ContactsApi();

    this.initialized = true;
    logger.info("Serviço Brevo inicializado com sucesso");
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
   * Obtém a API de e-mail transacional
   */
  public getEmailApi(): any {
    return this.emailApi;
  }

  /**
   * Obtém a API de SMS transacional
   */
  public getSmsApi(): any {
    return this.smsApi;
  }

  /**
   * Obtém a API de contatos
   */
  public getContactsApi(): any {
    return this.contactsApi;
  }

  /**
   * Obtém o sendSmtpEmail factory para criação de e-mails
   */
  public createEmailObject(): any {
    return new brevo.SendSmtpEmail();
  }

  /**
   * Obtém o sendTransacSms factory para criação de SMS
   */
  public createSmsObject(): any {
    return new brevo.SendTransacSms();
  }

  /**
   * Verifica se o serviço está inicializado
   * @throws Error se o serviço não estiver inicializado
   */
  private checkInitialization(): void {
    if (!this.initialized) {
      const error = new Error("Serviço Brevo não inicializado");
      logger.error("Falha ao acessar serviço Brevo", error);
      throw error;
    }
  }

  /**
   * Obtém informações da conta Brevo
   * Útil para testes de conectividade
   */
  public async getAccountInfo(): Promise<any> {
    this.checkInitialization();

    try {
      const accountApi = new brevo.AccountApi();
      const data = await accountApi.getAccount();
      logger.debug("Informações da conta Brevo obtidas com sucesso");
      return data;
    } catch (error) {
      logger.error("Erro ao obter informações da conta Brevo", error);
      throw error;
    }
  }
}

// Exporta uma instância do serviço
export const brevoService = BrevoService.getInstance();
