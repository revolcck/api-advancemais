/**
 * Configuração do módulo de assinaturas
 * @module modules/subscription/config/subscription.config
 */

import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";
import { MercadoPagoIntegrationType } from "@/modules/mercadopago/enums";
import { mercadoPagoConfig } from "@/modules/mercadopago/config/mercadopago.config";

/**
 * Interface para configuração do módulo de assinaturas
 */
export interface SubscriptionConfig {
  // Ativação do módulo
  enabled: boolean;

  // Integração com Mercado Pago
  mercadoPago: {
    enabled: boolean;
    useProduction: boolean;
    testMode: boolean;
    testEnabled: boolean; // Indica se o ambiente de teste está habilitado
  };

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
}

/**
 * Configuração padrão do módulo de assinaturas
 */
const defaultConfig: SubscriptionConfig = {
  enabled: true,
  mercadoPago: {
    enabled: true,
    useProduction: false,
    testMode: true,
    testEnabled: true, // Por padrão, habilitamos o modo de teste
  },
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
};

/**
 * Classe para gerenciar a configuração do módulo de assinaturas
 * Implementa o padrão Singleton e gerencia as configurações do módulo
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
        this.config.mercadoPago.enabled =
          process.env.MERCADOPAGO_ENABLED === "true";
      }

      // Configuração para uso de credenciais de produção
      // Configurações de ambiente garantem que produção e teste não podem estar habilitados simultaneamente
      const subscriptionProdEnabled = env.mercadoPago.subscription.prodEnabled;
      const checkoutProdEnabled = env.mercadoPago.checkout.prodEnabled;

      // Se qualquer tipo de integração estiver usando produção, consideramos que todo o módulo está em produção
      const isUsingProduction = subscriptionProdEnabled || checkoutProdEnabled;
      this.config.mercadoPago.useProduction = isUsingProduction;

      // Se estamos em produção, NÃO podemos estar em modo de teste
      this.config.mercadoPago.testMode = !isUsingProduction;

      // Teste só está habilitado se:
      // 1. Não estamos em produção E
      // 2. O teste está explicitamente habilitado nas configurações
      const subscriptionTestEnabled =
        !subscriptionProdEnabled && env.mercadoPago.subscription.testEnabled;
      const checkoutTestEnabled =
        !checkoutProdEnabled && env.mercadoPago.checkout.testEnabled;

      this.config.mercadoPago.testEnabled =
        !isUsingProduction && (subscriptionTestEnabled || checkoutTestEnabled);

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

      // Log da configuração em ambiente de desenvolvimento
      if (env.isDevelopment) {
        logger.debug("Configuração do módulo de assinaturas:", {
          ...this.config,
          mercadoPago: {
            ...this.config.mercadoPago,
            enabled: this.config.mercadoPago.enabled,
            useProduction: this.config.mercadoPago.useProduction,
            testMode: this.config.mercadoPago.testMode,
            testEnabled: this.config.mercadoPago.testEnabled,
          },
        });
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
    return this.config.enabled && this.config.mercadoPago.enabled;
  }

  /**
   * Verifica se estamos usando credenciais de produção
   */
  public isUsingProductionCredentials(): boolean {
    return this.config.mercadoPago.useProduction;
  }

  /**
   * Verifica se o ambiente de teste está habilitado
   */
  public isTestEnabled(): boolean {
    // Teste só pode estar habilitado se:
    // 1. Não estamos usando credenciais de produção E
    // 2. testEnabled está configurado como true
    return (
      !this.config.mercadoPago.useProduction &&
      this.config.mercadoPago.testEnabled
    );
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
    // Estamos em modo de teste se NÃO estamos em produção
    return !this.config.mercadoPago.useProduction;
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
      mercadoPago: {
        ...this.config.mercadoPago,
        ...partialConfig.mercadoPago,
      },
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

    // Se estamos atualizando para modo de produção, desative o modo de teste
    if (partialConfig.mercadoPago?.useProduction) {
      this.config.mercadoPago.testMode = false;
      this.config.mercadoPago.testEnabled = false;
    }

    logger.info("Configuração do módulo de assinaturas atualizada");
  }
}

/**
 * Instância única do gerenciador de configuração de assinaturas
 * Uso: import { subscriptionConfig } from '../config/subscription.config';
 */
export const subscriptionConfig = SubscriptionConfigManager.getInstance();
