/**
 * Configuração principal do MercadoPago
 * @module modules/mercadopago/config/mercadopago.config
 */

import { MercadoPagoConfig as SDKMercadoPagoConfig } from "mercadopago";
import { credentialsManager, MercadoPagoIntegrationType } from "./credentials";
import { logger } from "@/shared/utils/logger.utils";
import { env } from "@/config/environment";

/**
 * Classe de configuração do SDK do MercadoPago
 * Gerencia diferentes instâncias de configuração para cada tipo de integração
 */
export class MercadoPagoConfig {
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
      // Inicializa configuração para assinaturas
      if (
        credentialsManager.hasCredentials(
          MercadoPagoIntegrationType.SUBSCRIPTION
        )
      ) {
        const subscriptionCredentials = credentialsManager.getCredentials(
          MercadoPagoIntegrationType.SUBSCRIPTION
        );

        // Usando apenas accessToken que é a única propriedade garantida
        this.configs.set(
          MercadoPagoIntegrationType.SUBSCRIPTION,
          new SDKMercadoPagoConfig({
            accessToken: subscriptionCredentials.accessToken,
          })
        );

        // Log das credenciais inicializadas
        logger.debug(`Credenciais de SUBSCRIPTION configuradas`, {
          applicationId: subscriptionCredentials.applicationId,
          // Não logamos tokens sensíveis
        });
      }

      // Inicializa configuração para checkout
      if (
        credentialsManager.hasCredentials(MercadoPagoIntegrationType.CHECKOUT)
      ) {
        const checkoutCredentials = credentialsManager.getCredentials(
          MercadoPagoIntegrationType.CHECKOUT
        );

        // Usando apenas accessToken que é a única propriedade garantida
        this.configs.set(
          MercadoPagoIntegrationType.CHECKOUT,
          new SDKMercadoPagoConfig({
            accessToken: checkoutCredentials.accessToken,
          })
        );

        // Log das credenciais inicializadas
        logger.debug(`Credenciais de CHECKOUT configuradas`, {
          applicationId: checkoutCredentials.applicationId,
          // Não logamos tokens sensíveis
        });
      }

      this.isInitialized = true;
      logger.info("Configuração do MercadoPago inicializada com sucesso");
    } catch (error) {
      logger.error("Erro ao inicializar configuração do MercadoPago", error);
      throw new Error("Falha ao inicializar configuração do MercadoPago");
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
   * Verifica se estamos em modo de teste
   * @returns Verdadeiro se estamos usando credenciais de teste
   */
  public isTestMode(): boolean {
    // Verifica se o access token começa com TEST-
    for (const [_, config] of this.configs.entries()) {
      if (config.accessToken && config.accessToken.startsWith("TEST-")) {
        return true;
      }
    }
    return false;
  }

  /**
   * Obtém a chave pública para uso no frontend
   * Prioriza checkout sobre assinatura se ambos estiverem disponíveis
   * @returns Chave pública do MercadoPago
   * @throws Error se nenhuma chave estiver disponível
   */
  public getPublicKey(): string {
    this.ensureInitialized();

    // Prioriza checkout se disponível
    if (this.hasConfig(MercadoPagoIntegrationType.CHECKOUT)) {
      return credentialsManager.getCredentials(
        MercadoPagoIntegrationType.CHECKOUT
      ).publicKey;
    }

    // Fallback para assinatura
    if (this.hasConfig(MercadoPagoIntegrationType.SUBSCRIPTION)) {
      return credentialsManager.getCredentials(
        MercadoPagoIntegrationType.SUBSCRIPTION
      ).publicKey;
    }

    // Erro se nenhuma configuração estiver disponível
    throw new Error("Nenhuma chave pública do MercadoPago disponível");
  }
}

// Exporta a instância da configuração
export const mercadoPagoConfig = MercadoPagoConfig.getInstance();
