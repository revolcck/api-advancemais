/**
 * Configuração principal do MercadoPago
 * @module modules/mercadopago/config/mercadopago.config
 */

import { MercadoPagoConfig as SDKMercadoPagoConfig } from "mercadopago";
import { credentialsManager } from "./credentials";
import { logger } from "@/shared/utils/logger.utils";
import { env } from "@/config/environment";
import { MercadoPagoIntegrationType } from "../enums";
import { IMercadoPagoConfig } from "../interfaces";

/**
 * Classe de configuração do SDK do MercadoPago
 * Gerencia diferentes instâncias de configuração para cada tipo de integração
 */
export class MercadoPagoConfig implements IMercadoPagoConfig {
  private static instance: MercadoPagoConfig;
  private configs: Map<MercadoPagoIntegrationType, SDKMercadoPagoConfig> =
    new Map();
  private isInitialized: boolean = false;

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {}

  /**
   * Obtém a instância única da configuração do MercadoPago
   */
  public static getInstance(): MercadoPagoConfig {
    if (!MercadoPagoConfig.instance) {
      MercadoPagoConfig.instance = new MercadoPagoConfig();
    }
    return MercadoPagoConfig.instance;
  }

  /**
   * Inicializa as configurações do SDK para os diferentes tipos de integração
   * @throws Error se a inicialização falhar
   */
  private initialize(): void {
    try {
      // Verifica se o módulo está habilitado
      if (!credentialsManager.isEnabled()) {
        logger.info(
          "Módulo MercadoPago está desabilitado, pulando inicialização"
        );
        this.isInitialized = true;
        return;
      }

      // Inicializa configuração para assinaturas
      if (
        credentialsManager.hasCredentials(
          MercadoPagoIntegrationType.SUBSCRIPTION
        )
      ) {
        const subscriptionCredentials = credentialsManager.getCredentials(
          MercadoPagoIntegrationType.SUBSCRIPTION
        );

        // Configura o SDK com accessToken
        this.configs.set(
          MercadoPagoIntegrationType.SUBSCRIPTION,
          new SDKMercadoPagoConfig({
            accessToken: subscriptionCredentials.accessToken,
            options: {
              integratorId: env.mercadoPago.integratorId,
              corporationId: env.mercadoPago.integrator,
              plataformId: env.mercadoPago.platformId,
            },
          })
        );

        // Log das credenciais inicializadas
        logger.debug(
          `Configuração MercadoPago para SUBSCRIPTION inicializada`,
          {
            applicationId: subscriptionCredentials.applicationId,
            integratorId: env.mercadoPago.integratorId,
          }
        );
      }

      // Inicializa configuração para checkout
      if (
        credentialsManager.hasCredentials(MercadoPagoIntegrationType.CHECKOUT)
      ) {
        const checkoutCredentials = credentialsManager.getCredentials(
          MercadoPagoIntegrationType.CHECKOUT
        );
        // Configura o SDK com accessToken
        this.configs.set(
          MercadoPagoIntegrationType.CHECKOUT,
          new SDKMercadoPagoConfig({
            accessToken: checkoutCredentials.accessToken,
            options: {
              integratorId: env.mercadoPago.integratorId,
              corporationId: env.mercadoPago.integrator,
              plataformId: env.mercadoPago.platformId,
            },
          })
        );

        // Log das credenciais inicializadas
        logger.debug(`Configuração MercadoPago para CHECKOUT inicializada`, {
          applicationId: checkoutCredentials.applicationId,
          integratorId: env.mercadoPago.integratorId,
        });
      }

      if (this.configs.size === 0) {
        logger.warn("Nenhuma configuração do MercadoPago foi inicializada");
      } else {
        logger.info(
          `MercadoPago inicializado com ${this.configs.size} configurações`
        );
      }

      this.isInitialized = true;
    } catch (error) {
      const errorMessage = "Falha ao inicializar configuração do MercadoPago";
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Verifica se a configuração está inicializada e inicializa se necessário
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      this.initialize();
    }
  }

  /**
   * Obtém a configuração do SDK para um tipo específico de integração
   * @param type Tipo de integração
   * @returns Configuração do SDK
   * @throws Error se a configuração não for encontrada
   */
  public getConfig(type: MercadoPagoIntegrationType): SDKMercadoPagoConfig {
    this.ensureInitialized();

    const config = this.configs.get(type);

    if (!config) {
      const errorMessage = `Configuração não encontrada para o tipo de integração: ${type}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    return config;
  }

  /**
   * Verifica se a configuração está disponível para um tipo específico
   * @param type Tipo de integração
   * @returns Verdadeiro se a configuração estiver disponível
   */
  public hasConfig(type: MercadoPagoIntegrationType): boolean {
    this.ensureInitialized();
    return this.configs.has(type);
  }

  /**
   * Verifica se o módulo MercadoPago está disponível
   * @returns Verdadeiro se pelo menos uma configuração estiver disponível
   */
  public isAvailable(): boolean {
    this.ensureInitialized();
    return this.configs.size > 0;
  }

  /**
   * Verifica se estamos em modo de teste para um tipo específico
   * @param type Tipo de integração (opcional, verifica todas se não especificado)
   * @returns Verdadeiro se estamos usando credenciais de teste
   */
  public isTestMode(type?: MercadoPagoIntegrationType): boolean {
    this.ensureInitialized();

    // Se um tipo específico foi fornecido
    if (type) {
      const config = this.configs.get(type);
      if (!config) return true; // Assume teste se não houver configuração

      return config.accessToken.startsWith("TEST-");
    }

    // Verifica se o access token começa com TEST-
    for (const [_, config] of this.configs.entries()) {
      if (config.accessToken && !config.accessToken.startsWith("TEST-")) {
        // Se alguma configuração não for de teste, retorna false
        return false;
      }
    }

    // Se todas as configurações forem de teste (ou não houver configurações), retorna true
    return true;
  }

  /**
   * Obtém o token de acesso para um tipo específico de integração
   * @param type Tipo de integração
   * @returns Token de acesso
   * @throws Error se o token não for encontrado
   */
  public getAccessToken(type: MercadoPagoIntegrationType): string {
    this.ensureInitialized();

    const credentials = credentialsManager.getCredentials(type);
    return credentials.accessToken;
  }

  /**
   * Obtém a chave pública para uso no frontend
   * Prioriza checkout sobre assinatura se ambos estiverem disponíveis
   * @param type Tipo específico de integração (opcional)
   * @returns Chave pública do MercadoPago
   * @throws Error se nenhuma chave estiver disponível
   */
  public getPublicKey(type?: MercadoPagoIntegrationType): string {
    this.ensureInitialized();

    // Se um tipo específico foi solicitado
    if (type) {
      if (credentialsManager.hasCredentials(type)) {
        return credentialsManager.getCredentials(type).publicKey;
      }
      throw new Error(
        `Configuração não encontrada para o tipo de integração: ${type}`
      );
    }

    // Prioriza checkout se disponível
    if (
      credentialsManager.hasCredentials(MercadoPagoIntegrationType.CHECKOUT)
    ) {
      return credentialsManager.getCredentials(
        MercadoPagoIntegrationType.CHECKOUT
      ).publicKey;
    }

    // Fallback para assinatura
    if (
      credentialsManager.hasCredentials(MercadoPagoIntegrationType.SUBSCRIPTION)
    ) {
      return credentialsManager.getCredentials(
        MercadoPagoIntegrationType.SUBSCRIPTION
      ).publicKey;
    }

    // Erro se nenhuma configuração estiver disponível
    throw new Error("Nenhuma chave pública do MercadoPago disponível");
  }

  /**
   * Obtém o segredo para validação de webhook
   * @param type Tipo específico de integração (opcional)
   * @returns Segredo para validação de webhook
   */
  public getWebhookSecret(type?: MercadoPagoIntegrationType): string {
    return credentialsManager.getWebhookSecret(type);
  }
}

export const mercadoPagoConfig = MercadoPagoConfig.getInstance();
