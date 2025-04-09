/**
 * Configuração do módulo de assinaturas
 * @module modules/subscription/config/subscription.config
 */

import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";

/**
 * Interface para configuração do módulo de assinaturas
 */
export interface SubscriptionConfig {
  // Ativação do módulo
  enabled: boolean;

  // Integração com Mercado Pago
  mercadoPagoEnabled: boolean;

  // Configurações de renovação automática
  autoRenewal: {
    enabled: boolean;
    gracePeriodDays: number;
  };

  // Configurações de notificação
  notifications: {
    expirationWarningDays: number[];
    paymentFailureEnabled: boolean;
    renewalReminderEnabled: boolean;
  };

  // URLs para redirecionamento
  urls: {
    successUrl: string;
    failureUrl: string;
    pendingUrl: string;
    cancelUrl: string;
  };

  // Configurações de teste/desenvolvimento
  testMode: boolean;
}

/**
 * Configuração padrão do módulo de assinaturas
 */
const defaultConfig: SubscriptionConfig = {
  enabled: true,
  mercadoPagoEnabled: true,
  autoRenewal: {
    enabled: true,
    gracePeriodDays: 3,
  },
  notifications: {
    expirationWarningDays: [7, 3, 1],
    paymentFailureEnabled: true,
    renewalReminderEnabled: true,
  },
  urls: {
    successUrl: `${env.frontendUrl}/subscription/success`,
    failureUrl: `${env.frontendUrl}/subscription/failure`,
    pendingUrl: `${env.frontendUrl}/subscription/pending`,
    cancelUrl: `${env.frontendUrl}/subscription/cancel`,
  },
  testMode: env.isDevelopment,
};

/**
 * Classe para gerenciar a configuração do módulo de assinaturas
 */
export class SubscriptionConfigManager {
  private static instance: SubscriptionConfigManager;
  private config: SubscriptionConfig;

  /**
   * Construtor privado para o padrão Singleton
   */
  private constructor() {
    this.config = { ...defaultConfig };
    this.initialize();
  }

  /**
   * Obtém a instância única do gerenciador de configuração
   */
  public static getInstance(): SubscriptionConfigManager {
    if (!SubscriptionConfigManager.instance) {
      SubscriptionConfigManager.instance = new SubscriptionConfigManager();
    }
    return SubscriptionConfigManager.instance;
  }

  /**
   * Inicializa a configuração com base nas variáveis de ambiente
   */
  private initialize(): void {
    try {
      // Sobrescreve configurações com variáveis de ambiente, se definidas
      if (process.env.SUBSCRIPTION_ENABLED !== undefined) {
        this.config.enabled = process.env.SUBSCRIPTION_ENABLED === "true";
      }

      if (process.env.MERCADOPAGO_ENABLED !== undefined) {
        this.config.mercadoPagoEnabled =
          process.env.MERCADOPAGO_ENABLED === "true";
      }

      if (process.env.SUBSCRIPTION_AUTO_RENEWAL !== undefined) {
        this.config.autoRenewal.enabled =
          process.env.SUBSCRIPTION_AUTO_RENEWAL === "true";
      }

      if (process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS) {
        this.config.autoRenewal.gracePeriodDays = parseInt(
          process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS
        );
      }

      if (process.env.SUBSCRIPTION_EXPIRATION_WARNING_DAYS) {
        this.config.notifications.expirationWarningDays =
          process.env.SUBSCRIPTION_EXPIRATION_WARNING_DAYS.split(",").map(
            (day) => parseInt(day.trim())
          );
      }

      // URLs personalizadas
      if (process.env.SUBSCRIPTION_SUCCESS_URL) {
        this.config.urls.successUrl = process.env.SUBSCRIPTION_SUCCESS_URL;
      }

      if (process.env.SUBSCRIPTION_FAILURE_URL) {
        this.config.urls.failureUrl = process.env.SUBSCRIPTION_FAILURE_URL;
      }

      if (process.env.SUBSCRIPTION_PENDING_URL) {
        this.config.urls.pendingUrl = process.env.SUBSCRIPTION_PENDING_URL;
      }

      if (process.env.SUBSCRIPTION_CANCEL_URL) {
        this.config.urls.cancelUrl = process.env.SUBSCRIPTION_CANCEL_URL;
      }

      // Modo de teste
      if (process.env.SUBSCRIPTION_TEST_MODE !== undefined) {
        this.config.testMode = process.env.SUBSCRIPTION_TEST_MODE === "true";
      }

      // Log da configuração em ambiente de desenvolvimento
      if (env.isDevelopment) {
        logger.debug("Configuração do módulo de assinaturas:", this.config);
      }
    } catch (error) {
      logger.error(
        "Erro ao inicializar configuração do módulo de assinaturas:",
        error
      );
    }
  }

  /**
   * Obtém a configuração atual
   */
  public getConfig(): SubscriptionConfig {
    return { ...this.config };
  }

  /**
   * Verifica se o módulo está habilitado
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Verifica se a integração com Mercado Pago está habilitada
   */
  public isMercadoPagoEnabled(): boolean {
    return this.config.enabled && this.config.mercadoPagoEnabled;
  }

  /**
   * Verifica se a renovação automática está habilitada
   */
  public isAutoRenewalEnabled(): boolean {
    return this.config.enabled && this.config.autoRenewal.enabled;
  }

  /**
   * Obtém o período de carência para renovação
   */
  public getGracePeriodDays(): number {
    return this.config.autoRenewal.gracePeriodDays;
  }

  /**
   * Obtém as URLs para redirecionamento
   */
  public getUrls(): SubscriptionConfig["urls"] {
    return { ...this.config.urls };
  }

  /**
   * Verifica se estamos em modo de teste
   */
  public isTestMode(): boolean {
    return this.config.testMode;
  }

  /**
   * Atualiza parte da configuração em tempo de execução
   * @param partialConfig Configuração parcial a ser aplicada
   */
  public updateConfig(partialConfig: Partial<SubscriptionConfig>): void {
    this.config = {
      ...this.config,
      ...partialConfig,
      // Mescla objetos aninhados
      autoRenewal: {
        ...this.config.autoRenewal,
        ...partialConfig.autoRenewal,
      },
      notifications: {
        ...this.config.notifications,
        ...partialConfig.notifications,
      },
      urls: {
        ...this.config.urls,
        ...partialConfig.urls,
      },
    };

    logger.info("Configuração do módulo de assinaturas atualizada");
  }
}

export const subscriptionConfig = SubscriptionConfigManager.getInstance();
