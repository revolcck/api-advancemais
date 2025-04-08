/**
 * Serviço Core para integração com MercadoPago
 * Centraliza o acesso às APIs do MercadoPago e fornece métodos utilitários
 * @module modules/mercadopago/services/core.service
 */

import {
  MercadoPagoConfig,
  Payment,
  Customer,
  PreApproval,
  Preference,
  MerchantOrder,
  CardToken,
} from "mercadopago";

import { logger } from "@/shared/utils/logger.utils";
import { mercadoPagoConfig } from "../config/mercadopago.config";
import { MercadoPagoIntegrationType } from "../enums";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { PaymentAdapter } from "../adapters/payment.adapter";
import { PreferenceAdapter } from "../adapters/preference.adapter";
import { SubscriptionAdapter } from "../adapters/subscription.adapter";
import { MerchantOrderAdapter } from "../adapters/merchant-order.adapter";
import { IConnectivityInfo, IMercadoPagoCoreService } from "../interfaces";

/**
 * Classe principal de serviço para integração com o MercadoPago
 */
export class MercadoPagoCoreService implements IMercadoPagoCoreService {
  private static instance: MercadoPagoCoreService;

  // Cache para adaptadores
  private adaptersCache: {
    payment: Map<MercadoPagoIntegrationType, PaymentAdapter>;
    preference: Map<MercadoPagoIntegrationType, PreferenceAdapter>;
    subscription: SubscriptionAdapter | null;
    merchantOrder: Map<MercadoPagoIntegrationType, MerchantOrderAdapter>;
  } = {
    payment: new Map(),
    preference: new Map(),
    subscription: null,
    merchantOrder: new Map(),
  };

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {}

  /**
   * Obtém a instância única do serviço
   */
  public static getInstance(): MercadoPagoCoreService {
    if (!MercadoPagoCoreService.instance) {
      MercadoPagoCoreService.instance = new MercadoPagoCoreService();
    }
    return MercadoPagoCoreService.instance;
  }

  /**
   * Verifica se o serviço está disponível
   * @throws ServiceUnavailableError se o serviço não estiver disponível
   */
  private checkAvailability(): void {
    if (!mercadoPagoConfig.isAvailable()) {
      throw new ServiceUnavailableError(
        "Serviço do Mercado Pago não está disponível",
        "MERCADOPAGO_SERVICE_UNAVAILABLE"
      );
    }
  }

  /**
   * Obtém o adaptador de pagamento para o tipo especificado
   * @param type Tipo de integração
   * @returns Adaptador de pagamento
   */
  public getPaymentAdapter(
    type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ): PaymentAdapter {
    this.checkAvailability();

    // Verifica se já existe um adaptador em cache
    if (this.adaptersCache.payment.has(type)) {
      return this.adaptersCache.payment.get(type)!;
    }

    // Cria uma nova instância do cliente e do adaptador
    const paymentClient = new Payment(mercadoPagoConfig.getConfig(type));
    const adapter = new PaymentAdapter(paymentClient, type);

    // Armazena no cache
    this.adaptersCache.payment.set(type, adapter);

    logger.debug("Adaptador de pagamento do MercadoPago inicializado", {
      type,
    });

    return adapter;
  }

  /**
   * Obtém o adaptador de preferência para o tipo especificado
   * @param type Tipo de integração
   * @returns Adaptador de preferência
   */
  public getPreferenceAdapter(
    type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ): PreferenceAdapter {
    this.checkAvailability();

    // Verifica se já existe um adaptador em cache
    if (this.adaptersCache.preference.has(type)) {
      return this.adaptersCache.preference.get(type)!;
    }

    // Cria uma nova instância do cliente e do adaptador
    const preferenceClient = new Preference(mercadoPagoConfig.getConfig(type));
    const adapter = new PreferenceAdapter(preferenceClient, type);

    // Armazena no cache
    this.adaptersCache.preference.set(type, adapter);

    logger.debug("Adaptador de preferência do MercadoPago inicializado", {
      type,
    });

    return adapter;
  }

  /**
   * Obtém o adaptador de assinatura (sempre usa tipo SUBSCRIPTION)
   * @returns Adaptador de assinatura
   */
  public getSubscriptionAdapter(): SubscriptionAdapter {
    this.checkAvailability();

    // Verifica se já existe um adaptador em cache
    if (this.adaptersCache.subscription) {
      return this.adaptersCache.subscription;
    }

    // Cria uma nova instância do cliente e do adaptador
    const subscriptionClient = new PreApproval(
      mercadoPagoConfig.getConfig(MercadoPagoIntegrationType.SUBSCRIPTION)
    );
    const adapter = new SubscriptionAdapter(subscriptionClient);

    // Armazena no cache
    this.adaptersCache.subscription = adapter;

    logger.debug("Adaptador de assinatura do MercadoPago inicializado");

    return adapter;
  }

  /**
   * Obtém o adaptador de ordem de mercador para o tipo especificado
   * @param type Tipo de integração
   * @returns Adaptador de ordem de mercador
   */
  public getMerchantOrderAdapter(
    type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ): MerchantOrderAdapter {
    this.checkAvailability();

    // Verifica se já existe um adaptador em cache
    if (this.adaptersCache.merchantOrder.has(type)) {
      return this.adaptersCache.merchantOrder.get(type)!;
    }

    // Cria uma nova instância do cliente e do adaptador
    const merchantOrderClient = new MerchantOrder(
      mercadoPagoConfig.getConfig(type)
    );
    const adapter = new MerchantOrderAdapter(merchantOrderClient, type);

    // Armazena no cache
    this.adaptersCache.merchantOrder.set(type, adapter);

    logger.debug("Adaptador de ordem de mercador do MercadoPago inicializado", {
      type,
    });

    return adapter;
  }

  /**
   * Testa a conectividade com a API do Mercado Pago para um tipo específico de integração
   * @param type Tipo de integração a ser testado
   * @returns Informações da conta e status da conexão
   */
  public async testConnectivity(
    type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ): Promise<IConnectivityInfo> {
    try {
      this.checkAvailability();

      // Verifica se o tipo de integração específico está disponível
      if (!mercadoPagoConfig.hasConfig(type)) {
        throw new ServiceUnavailableError(
          `Configuração MercadoPago para '${type}' não está disponível`,
          "MERCADOPAGO_CONFIG_UNAVAILABLE"
        );
      }

      // Obtém informações do usuário para testar a conexão
      const paymentAdapter = this.getPaymentAdapter(type);

      try {
        // Tenta fazer uma operação simples para testar a conectividade
        await paymentAdapter.get("0").catch(() => {
          // Ignora erro específico, apenas queremos verificar a conectividade
          return { status: 200 };
        });

        // Se chegou até aqui, a conexão está funcionando
        logger.info(
          `Teste de conectividade com o Mercado Pago (${type}) realizado com sucesso`
        );

        return {
          success: true,
          account: {
            id: "connected",
            email: mercadoPagoConfig.isTestMode(type)
              ? "test_user"
              : "production_user",
            siteId: "MLB", // Brasil (Mercado Livre Brasil)
          },
        };
      } catch (error) {
        // Se ocorrer erro na verificação, formata o erro
        logger.error(
          `Erro no teste de conectividade com o Mercado Pago (${type}):`,
          error
        );

        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro desconhecido",
          errorCode: "MERCADOPAGO_CONNECTIVITY_ERROR",
        };
      }
    } catch (error) {
      logger.error(
        `Erro no teste de conectividade com o Mercado Pago (${type}):`,
        error
      );

      // Se for um erro já tratado
      if (error instanceof ServiceUnavailableError) {
        return {
          success: false,
          error: error.message,
          errorCode: error.errorCode,
        };
      }

      // Erro genérico
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        errorCode: "MERCADOPAGO_CONNECTIVITY_ERROR",
      };
    }
  }

  /**
   * Formata um erro do Mercado Pago para log e retorno
   * @param error Erro original
   * @param operation Nome da operação que falhou
   * @returns Objeto formatado com detalhes do erro
   */
  public formatError(
    error: any,
    operation: string
  ): { message: string; code: string; details: any } {
    let message = `Erro na operação ${operation} do Mercado Pago`;
    let code = "MERCADOPAGO_ERROR";
    let details = null;

    // Tenta extrair detalhes do erro
    if (error && error.cause && Array.isArray(error.cause)) {
      // Formato específico de erro da API do Mercado Pago
      const causes = error.cause
        .map((c: any) => c.description || c.message || JSON.stringify(c))
        .join(", ");

      message = `${message}: ${causes}`;
      code = `MERCADOPAGO_${operation.toUpperCase()}_ERROR`;
      details = error.cause;
    } else if (error && error.response && error.response.data) {
      // Erro HTTP com resposta estruturada
      const errorData = error.response.data;
      message = `${message}: ${errorData.message || JSON.stringify(errorData)}`;
      code = errorData.code || `MERCADOPAGO_${operation.toUpperCase()}_ERROR`;
      details = errorData;
    } else if (error instanceof Error) {
      // Erro padrão JavaScript
      message = `${message}: ${error.message}`;
      details = { stack: error.stack };
    }

    logger.error(`${message}`, { details });

    return {
      message,
      code,
      details,
    };
  }
}

// Exporta uma instância do serviço
export const mercadoPagoCoreService = MercadoPagoCoreService.getInstance();
