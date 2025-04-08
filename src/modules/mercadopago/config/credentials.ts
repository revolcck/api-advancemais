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
   * O ID da aplicação é o segundo segmento após 'TEST-' no token
   * @param accessToken Token de acesso do MercadoPago
   * @returns ID da aplicação ou undefined se não puder ser extraído
   */
  private extractApplicationId(accessToken: string): string {
    try {
      if (accessToken.startsWith("TEST-")) {
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
      const subscriptionAccessToken = env.mercadoPago.subscription.accessToken;
      const subscriptionWebhookSecret =
        env.mercadoPago.webhookSecrets?.subscription || "";

      if (subscriptionAccessToken) {
        this.credentials.set(MercadoPagoIntegrationType.SUBSCRIPTION, {
          accessToken: subscriptionAccessToken,
          publicKey: env.mercadoPago.subscription.publicKey,
          integrationType: MercadoPagoIntegrationType.SUBSCRIPTION,
          applicationId: this.extractApplicationId(subscriptionAccessToken),
        });

        // Armazena o segredo do webhook para assinaturas
        this.webhookSecrets.set(
          MercadoPagoIntegrationType.SUBSCRIPTION,
          subscriptionWebhookSecret
        );

        logger.debug("Credenciais de assinatura do MercadoPago configuradas");
      } else {
        logger.warn("Credenciais de assinatura do MercadoPago não encontradas");
      }

      // Credenciais para checkout
      const checkoutAccessToken = env.mercadoPago.checkout.accessToken;
      const checkoutWebhookSecret =
        env.mercadoPago.webhookSecrets?.checkout || "";

      if (checkoutAccessToken) {
        this.credentials.set(MercadoPagoIntegrationType.CHECKOUT, {
          accessToken: checkoutAccessToken,
          publicKey: env.mercadoPago.checkout.publicKey,
          integrationType: MercadoPagoIntegrationType.CHECKOUT,
          applicationId: this.extractApplicationId(checkoutAccessToken),
        });

        // Armazena o segredo do webhook para checkout
        this.webhookSecrets.set(
          MercadoPagoIntegrationType.CHECKOUT,
          checkoutWebhookSecret
        );

        logger.debug("Credenciais de checkout do MercadoPago configuradas");
      } else {
        logger.warn("Credenciais de checkout do MercadoPago não encontradas");
      }

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
      !!credentials && !!credentials.accessToken && !!credentials.publicKey
    );
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
      }

      this.credentials.set(type, newCredentials);
      logger.info(
        `Credenciais do MercadoPago atualizadas para o tipo: ${type}`
      );
    } else {
      // Cria novas credenciais se não existirem
      if (credentials.accessToken && credentials.publicKey) {
        const newCredentials: IMercadoPagoCredentials = {
          accessToken: credentials.accessToken,
          publicKey: credentials.publicKey,
          integrationType: type,
          applicationId: this.extractApplicationId(credentials.accessToken),
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
