/**
 * Gerenciamento de credenciais para as integrações com o MercadoPago
 * @module modules/mercadopago/config/credentials
 */

import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";
import { MercadoPagoIntegrationType } from "../enums";
import {
  IMercadoPagoCredentials,
  ICredentialsManager,
} from "../interfaces/config.interface";

/**
 * Gerenciador de credenciais do MercadoPago
 * Permite utilizar diferentes credenciais para diferentes tipos de integração
 */
export class MercadoPagoCredentialsManager implements ICredentialsManager {
  private static instance: MercadoPagoCredentialsManager;
  private credentials: Map<
    MercadoPagoIntegrationType,
    IMercadoPagoCredentials
  > = new Map();
  private initialized: boolean = false;

  // Mapeamento de tipo de integração para segredo de webhook
  private webhookSecrets: Map<MercadoPagoIntegrationType, string> = new Map();

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {
    this.initialize();
  }

  /**
   * Obtém a instância única do gerenciador de credenciais
   * @returns Instância do gerenciador de credenciais
   */
  public static getInstance(): MercadoPagoCredentialsManager {
    if (!MercadoPagoCredentialsManager.instance) {
      MercadoPagoCredentialsManager.instance =
        new MercadoPagoCredentialsManager();
    }
    return MercadoPagoCredentialsManager.instance;
  }

  /**
   * Extrai o ID da aplicação do token de acesso
   * O ID da aplicação é o segundo segmento após 'TEST-' ou 'APP_USR-' no token
   * @param accessToken Token de acesso do MercadoPago
   * @returns ID da aplicação ou undefined se não puder ser extraído
   */
  private extractApplicationId(accessToken: string): string {
    try {
      // Verifica se é um token de teste ou produção
      if (accessToken.startsWith("TEST-")) {
        const parts = accessToken.split("-");
        if (parts.length >= 2) {
          return parts[1];
        }
      } else if (accessToken.startsWith("APP_USR-")) {
        const parts = accessToken.split("-");
        if (parts.length >= 2) {
          return parts[1];
        }
      }

      // Caso não consiga extrair, retorna um valor default
      logger.warn(
        "Não foi possível extrair o applicationId do accessToken. Usando ID genérico."
      );
      return "unknown-app-id";
    } catch (error) {
      logger.warn("Erro ao extrair applicationId do accessToken", error);
      return "error-extracting-app-id";
    }
  }

  /**
   * Inicializa as credenciais a partir das variáveis de ambiente
   * @throws Error se falhar ao inicializar credenciais
   */
  private initialize(): void {
    if (this.initialized) {
      return;
    }

    try {
      // Verifica se o módulo está habilitado
      if (!env.mercadoPago.enabled) {
        logger.info("Módulo MercadoPago está desabilitado");
        this.initialized = true;
        return;
      }

      // Credenciais para assinaturas
      this.initSubscriptionCredentials();

      // Credenciais para checkout
      this.initCheckoutCredentials();

      // Verifica se pelo menos um tipo de credencial foi configurado
      if (this.credentials.size === 0) {
        logger.warn("Nenhuma credencial do MercadoPago foi configurada");
      } else {
        logger.info(
          `MercadoPago inicializado com ${this.credentials.size} tipos de credenciais`
        );
      }

      this.initialized = true;
    } catch (error) {
      const errorMessage = "Falha ao inicializar credenciais do MercadoPago";
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Inicializa as credenciais para assinaturas (teste ou produção)
   */
  private initSubscriptionCredentials(): void {
    // Verifica se as credenciais de produção devem ser utilizadas
    const useProdCredentials = env.mercadoPago.subscription.prodEnabled;
    const testEnabled = env.mercadoPago.subscription.testEnabled;

    // Seleciona as credenciais apropriadas
    const accessToken = useProdCredentials
      ? env.mercadoPago.subscription.prodAccessToken
      : env.mercadoPago.subscription.accessToken;

    const publicKey = useProdCredentials
      ? env.mercadoPago.subscription.prodPublicKey
      : env.mercadoPago.subscription.publicKey;

    const clientId = useProdCredentials
      ? env.mercadoPago.subscription.prodClientId
      : env.mercadoPago.subscription.clientId;

    const clientSecret = useProdCredentials
      ? env.mercadoPago.subscription.prodClientSecret
      : env.mercadoPago.subscription.clientSecret;

    const webhookSecret = useProdCredentials
      ? env.mercadoPago.subscription.prodWebhookSecret
      : env.mercadoPago.subscription.webhookSecret;

    if (accessToken) {
      this.credentials.set(MercadoPagoIntegrationType.SUBSCRIPTION, {
        accessToken,
        publicKey,
        clientId,
        clientSecret,
        integrationType: MercadoPagoIntegrationType.SUBSCRIPTION,
        applicationId: this.extractApplicationId(accessToken),
        isProduction: useProdCredentials,
        testEnabled,
      });

      // Armazena o segredo do webhook para assinaturas
      this.webhookSecrets.set(
        MercadoPagoIntegrationType.SUBSCRIPTION,
        webhookSecret
      );

      logger.debug(
        `Credenciais de assinatura do MercadoPago configuradas (${
          useProdCredentials ? "produção" : "teste"
        })`
      );
    } else {
      logger.warn("Credenciais de assinatura do MercadoPago não encontradas");
    }
  }

  /**
   * Inicializa as credenciais para checkout (teste ou produção)
   */
  private initCheckoutCredentials(): void {
    // Verifica se as credenciais de produção devem ser utilizadas
    const useProdCredentials = env.mercadoPago.checkout.prodEnabled;
    const testEnabled = env.mercadoPago.checkout.testEnabled;

    // Seleciona as credenciais apropriadas
    const accessToken = useProdCredentials
      ? env.mercadoPago.checkout.prodAccessToken
      : env.mercadoPago.checkout.accessToken;

    const publicKey = useProdCredentials
      ? env.mercadoPago.checkout.prodPublicKey
      : env.mercadoPago.checkout.publicKey;

    const clientId = useProdCredentials
      ? env.mercadoPago.checkout.prodClientId
      : env.mercadoPago.checkout.clientId;

    const clientSecret = useProdCredentials
      ? env.mercadoPago.checkout.prodClientSecret
      : env.mercadoPago.checkout.clientSecret;

    const webhookSecret = useProdCredentials
      ? env.mercadoPago.checkout.prodWebhookSecret
      : env.mercadoPago.checkout.webhookSecret;

    if (accessToken) {
      this.credentials.set(MercadoPagoIntegrationType.CHECKOUT, {
        accessToken,
        publicKey,
        clientId,
        clientSecret,
        integrationType: MercadoPagoIntegrationType.CHECKOUT,
        applicationId: this.extractApplicationId(accessToken),
        isProduction: useProdCredentials,
        testEnabled,
      });

      // Armazena o segredo do webhook para checkout
      this.webhookSecrets.set(
        MercadoPagoIntegrationType.CHECKOUT,
        webhookSecret
      );

      logger.debug(
        `Credenciais de checkout do MercadoPago configuradas (${
          useProdCredentials ? "produção" : "teste"
        })`
      );
    } else {
      logger.warn("Credenciais de checkout do MercadoPago não encontradas");
    }
  }

  /**
   * Obtém as credenciais para um tipo específico de integração
   * @param type Tipo de integração
   * @returns Credenciais para o tipo especificado
   * @throws Error se credenciais não forem encontradas
   */
  public getCredentials(
    type: MercadoPagoIntegrationType
  ): IMercadoPagoCredentials {
    if (!this.initialized) {
      this.initialize();
    }

    const credentials = this.credentials.get(type);

    if (!credentials) {
      const errorMessage = `Credenciais não encontradas para o tipo de integração: ${type}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    return credentials;
  }

  /**
   * Verifica se as credenciais para um tipo específico estão configuradas
   * @param type Tipo de integração
   * @returns Verdadeiro se as credenciais estiverem configuradas
   */
  public hasCredentials(type: MercadoPagoIntegrationType): boolean {
    if (!this.initialized) {
      this.initialize();
    }

    const credentials = this.credentials.get(type);
    return (
      !!credentials &&
      !!credentials.accessToken &&
      !!credentials.publicKey &&
      !!credentials.clientId &&
      !!credentials.clientSecret
    );
  }

  /**
   * Verifica se as credenciais para um tipo específico são de produção
   * @param type Tipo de integração
   * @returns Verdadeiro se as credenciais forem de produção
   */
  public isProductionCredentials(type: MercadoPagoIntegrationType): boolean {
    if (!this.initialized) {
      this.initialize();
    }

    const credentials = this.credentials.get(type);
    return !!credentials && !!credentials.isProduction;
  }

  /**
   * Verifica se o modo de teste está habilitado para um tipo específico
   * @param type Tipo de integração
   * @returns Verdadeiro se o modo de teste estiver habilitado
   */
  public isTestEnabled(type: MercadoPagoIntegrationType): boolean {
    if (!this.initialized) {
      this.initialize();
    }

    const credentials = this.credentials.get(type);
    return !!credentials && !!credentials.testEnabled;
  }

  /**
   * Atualiza as credenciais para um tipo específico
   * Útil principalmente para testes ou troca de ambiente
   *
   * @param type Tipo de integração
   * @param credentials Novas credenciais
   */
  public updateCredentials(
    type: MercadoPagoIntegrationType,
    credentials: Partial<IMercadoPagoCredentials>
  ): void {
    if (!this.initialized) {
      this.initialize();
    }

    const currentCredentials = this.credentials.get(type);

    if (currentCredentials) {
      // Atualiza o applicationId se o accessToken foi alterado
      const newCredentials = { ...currentCredentials, ...credentials };

      if (
        credentials.accessToken &&
        credentials.accessToken !== currentCredentials.accessToken
      ) {
        newCredentials.applicationId = this.extractApplicationId(
          credentials.accessToken
        );

        // Atualiza o flag de produção com base no formato do token
        newCredentials.isProduction =
          !credentials.accessToken.startsWith("TEST-");
      }

      this.credentials.set(type, newCredentials);
      logger.info(
        `Credenciais do MercadoPago atualizadas para o tipo: ${type}`
      );
    } else {
      // Cria novas credenciais se não existirem
      if (
        credentials.accessToken &&
        credentials.publicKey &&
        credentials.clientId &&
        credentials.clientSecret
      ) {
        const isProduction = !credentials.accessToken.startsWith("TEST-");

        const newCredentials: IMercadoPagoCredentials = {
          accessToken: credentials.accessToken,
          publicKey: credentials.publicKey,
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          integrationType: type,
          applicationId: this.extractApplicationId(credentials.accessToken),
          isProduction,
          testEnabled: credentials.testEnabled,
          ...credentials,
        };

        this.credentials.set(type, newCredentials);
        logger.info(
          `Novas credenciais do MercadoPago configuradas para o tipo: ${type}`
        );
      } else {
        logger.warn(
          `Dados insuficientes para criar credenciais do tipo: ${type}`
        );
      }
    }
  }

  /**
   * Obtém o segredo para validação de webhook
   * @param type Tipo de integração (obrigatório)
   * @returns Segredo para validação de webhook ou string vazia se não configurado
   */
  public getWebhookSecret(type?: MercadoPagoIntegrationType): string {
    if (!this.initialized) {
      this.initialize();
    }

    // Se um tipo específico foi fornecido, tenta obter o segredo específico
    if (type && this.webhookSecrets.has(type)) {
      return this.webhookSecrets.get(type) || "";
    }

    // Se não foi fornecido tipo específico ou não há segredo para o tipo específico,
    // tentamos buscar segredo do CHECKOUT como fallback (mais comum)
    if (this.webhookSecrets.has(MercadoPagoIntegrationType.CHECKOUT)) {
      return this.webhookSecrets.get(MercadoPagoIntegrationType.CHECKOUT) || "";
    }

    // Se ainda não encontrou, tenta o segredo de SUBSCRIPTION como último recurso
    if (this.webhookSecrets.has(MercadoPagoIntegrationType.SUBSCRIPTION)) {
      return (
        this.webhookSecrets.get(MercadoPagoIntegrationType.SUBSCRIPTION) || ""
      );
    }

    // Se não encontrou nenhum segredo, retorna string vazia
    logger.warn(
      `Segredo de webhook não encontrado${type ? ` para o tipo: ${type}` : ""}`
    );
    return "";
  }

  /**
   * Verifica se o módulo MercadoPago está habilitado
   * @returns true se o módulo estiver habilitado
   */
  public isEnabled(): boolean {
    return env.mercadoPago.enabled;
  }
}

// Exporta uma instância do gerenciador de credenciais
export const credentialsManager = MercadoPagoCredentialsManager.getInstance();
