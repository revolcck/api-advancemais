/**
 * Configuração principal do MercadoPago
 * @module modules/mercadopago/config/mercadopago.config
 */

import { MercadoPagoConfig as SDKMercadoPagoConfig } from "mercadopago";
import { credentialsManager, MercadoPagoIntegrationType } from "./credentials";
import { logger } from "@/shared/utils/logger.utils";
import { env } from "@/config/environment";

/**
 * Configuração do SDK do MercadoPago
 */
export class MercadoPagoConfig {
  private static instance: MercadoPagoConfig;
  private configs: Map<MercadoPagoIntegrationType, SDKMercadoPagoConfig> =
    new Map();
  private isInitialized: boolean = false;

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {
    this.initialize();
  }

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

        this.configs.set(
          MercadoPagoIntegrationType.SUBSCRIPTION,
          new SDKMercadoPagoConfig({
            accessToken: subscriptionCredentials.accessToken,
            corporationId: subscriptionCredentials.applicationId,
            integratorId: env.mercadoPago.integratorId,
            trackingId: `${env.appName}-subscription`,
            platformId: env.mercadoPago.platformId,
            corporationName: "AdvanceMais Assinatura",
            integrator: env.mercadoPago.integrator,
          })
        );
      }

      // Inicializa configuração para checkout
      if (
        credentialsManager.hasCredentials(MercadoPagoIntegrationType.CHECKOUT)
      ) {
        const checkoutCredentials = credentialsManager.getCredentials(
          MercadoPagoIntegrationType.CHECKOUT
        );

        this.configs.set(
          MercadoPagoIntegrationType.CHECKOUT,
          new SDKMercadoPagoConfig({
            accessToken: checkoutCredentials.accessToken,
            corporationId: checkoutCredentials.applicationId,
            integratorId: env.mercadoPago.integratorId,
            trackingId: `${env.appName}-checkout`,
            platformId: env.mercadoPago.platformId,
            corporationName: "AdvanceMais Controle Total",
            integrator: env.mercadoPago.integrator,
          })
        );
      }

      this.isInitialized = true;
      logger.info("Configuração do MercadoPago inicializada com sucesso");
    } catch (error) {
      logger.error("Erro ao inicializar configuração do MercadoPago", error);
      throw new Error("Falha ao inicializar configuração do MercadoPago");
    }
  }

  /**
   * Obtém a configuração do SDK para um tipo específico de integração
   * @param type Tipo de integração
   * @returns Configuração do SDK
   */
  public getConfig(type: MercadoPagoIntegrationType): SDKMercadoPagoConfig {
    if (!this.isInitialized) {
      this.initialize();
    }

    const config = this.configs.get(type);

    if (!config) {
      logger.error(
        `Configuração não encontrada para o tipo de integração: ${type}`
      );
      throw new Error(
        `Configuração não encontrada para o tipo de integração: ${type}`
      );
    }

    return config;
  }

  /**
   * Verifica se a configuração está disponível para um tipo específico
   * @param type Tipo de integração
   * @returns Verdadeiro se a configuração estiver disponível
   */
  public hasConfig(type: MercadoPagoIntegrationType): boolean {
    return this.configs.has(type);
  }
}

// Exportar a instância da configuração
export const mercadoPagoConfig = MercadoPagoConfig.getInstance();
