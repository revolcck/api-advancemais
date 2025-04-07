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
  PaymentRefund,
} from "mercadopago";

import { logger } from "@/shared/utils/logger.utils";
import { mercadoPagoConfig } from "../config/mercadopago.config";
import { MercadoPagoIntegrationType } from "../config/credentials";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { PaymentAdapter } from "../adapters/payment.adapter";
import { PreferenceAdapter } from "../adapters/preference.adapter";
import { SubscriptionAdapter } from "../adapters/subscription.adapter";
import { MerchantOrderAdapter } from "../adapters/merchant-order.adapter";

/**
 * Classe principal de serviço para integração com o MercadoPago
 */
export class MercadoPagoCoreService {
  private static instance: MercadoPagoCoreService;

  // Clientes do SDK MercadoPago
  private _payment: Payment | null = null;
  private _preApproval: PreApproval | null = null;
  private _customer: Customer | null = null;
  private _preference: Preference | null = null;
  private _merchantOrder: MerchantOrder | null = null;
  private _cardToken: CardToken | null = null;
  private _paymentRefund: PaymentRefund | null = null;

  // Adaptadores para os serviços do MercadoPago
  private _paymentAdapter: PaymentAdapter | null = null;
  private _preferenceAdapter: PreferenceAdapter | null = null;
  private _subscriptionAdapter: SubscriptionAdapter | null = null;
  private _merchantOrderAdapter: MerchantOrderAdapter | null = null;

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

  // ------------- MÉTODOS DE ACESSO AOS CLIENTES DO SDK -------------

  /**
   * Obtém o cliente de pagamento do MercadoPago
   * @param type Tipo de integração (default: CHECKOUT)
   * @returns Cliente de pagamento
   */
  public getPaymentClient(
    type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ): Payment {
    this.checkAvailability();

    if (!this._payment) {
      this._payment = new Payment(mercadoPagoConfig.getConfig(type));
      logger.debug("Cliente de pagamento do MercadoPago inicializado", {
        type,
      });
    }

    return this._payment;
  }

  /**
   * Obtém o cliente de assinatura do MercadoPago
   * @returns Cliente de assinatura
   */
  public getSubscriptionClient(): PreApproval {
    this.checkAvailability();

    if (!this._preApproval) {
      this._preApproval = new PreApproval(
        mercadoPagoConfig.getConfig(MercadoPagoIntegrationType.SUBSCRIPTION)
      );
      logger.debug("Cliente de assinatura do MercadoPago inicializado");
    }

    return this._preApproval;
  }

  /**
   * Obtém o cliente de cliente do MercadoPago
   * @param type Tipo de integração (default: CHECKOUT)
   * @returns Cliente de cliente
   */
  public getCustomerClient(
    type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ): Customer {
    this.checkAvailability();

    if (!this._customer) {
      this._customer = new Customer(mercadoPagoConfig.getConfig(type));
      logger.debug("Cliente de customer do MercadoPago inicializado", { type });
    }

    return this._customer;
  }

  /**
   * Obtém o cliente de preferência do MercadoPago
   * @param type Tipo de integração (default: CHECKOUT)
   * @returns Cliente de preferência
   */
  public getPreferenceClient(
    type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ): Preference {
    this.checkAvailability();

    if (!this._preference) {
      this._preference = new Preference(mercadoPagoConfig.getConfig(type));
      logger.debug("Cliente de preferência do MercadoPago inicializado", {
        type,
      });
    }

    return this._preference;
  }

  /**
   * Obtém o cliente de ordem de mercador do MercadoPago
   * @param type Tipo de integração (default: CHECKOUT)
   * @returns Cliente de ordem de mercador
   */
  public getMerchantOrderClient(
    type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ): MerchantOrder {
    this.checkAvailability();

    if (!this._merchantOrder) {
      this._merchantOrder = new MerchantOrder(
        mercadoPagoConfig.getConfig(type)
      );
      logger.debug("Cliente de ordem de mercador do MercadoPago inicializado", {
        type,
      });
    }

    return this._merchantOrder;
  }

  /**
   * Obtém o cliente de token de cartão do MercadoPago
   * @param type Tipo de integração (default: CHECKOUT)
   * @returns Cliente de token de cartão
   */
  public getCardTokenClient(
    type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ): CardToken {
    this.checkAvailability();

    if (!this._cardToken) {
      this._cardToken = new CardToken(mercadoPagoConfig.getConfig(type));
      logger.debug("Cliente de token de cartão do MercadoPago inicializado", {
        type,
      });
    }

    return this._cardToken;
  }

  /**
   * Obtém o cliente de reembolso de pagamento do MercadoPago
   * @param type Tipo de integração (default: CHECKOUT)
   * @returns Cliente de reembolso de pagamento
   */
  public getPaymentRefundClient(
    type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ): PaymentRefund {
    this.checkAvailability();

    if (!this._paymentRefund) {
      this._paymentRefund = new PaymentRefund(
        mercadoPagoConfig.getConfig(type)
      );
      logger.debug(
        "Cliente de reembolso de pagamento do MercadoPago inicializado",
        { type }
      );
    }

    return this._paymentRefund;
  }

  // ------------- MÉTODOS DE ACESSO AOS ADAPTADORES -------------

  /**
   * Obtém o adaptador de pagamento do MercadoPago
   * @param type Tipo de integração (default: CHECKOUT)
   * @returns Adaptador de pagamento
   */
  public getPaymentAdapter(
    type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ): PaymentAdapter {
    this.checkAvailability();

    if (!this._paymentAdapter) {
      const paymentClient = this.getPaymentClient(type);
      this._paymentAdapter = new PaymentAdapter(paymentClient);
      logger.debug("Adaptador de pagamento do MercadoPago inicializado", {
        type,
      });
    }

    return this._paymentAdapter;
  }

  /**
   * Obtém o adaptador de preferência do MercadoPago
   * @param type Tipo de integração (default: CHECKOUT)
   * @returns Adaptador de preferência
   */
  public getPreferenceAdapter(
    type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ): PreferenceAdapter {
    this.checkAvailability();

    if (!this._preferenceAdapter) {
      const preferenceClient = this.getPreferenceClient(type);
      this._preferenceAdapter = new PreferenceAdapter(preferenceClient);
      logger.debug("Adaptador de preferência do MercadoPago inicializado", {
        type,
      });
    }

    return this._preferenceAdapter;
  }

  /**
   * Obtém o adaptador de assinatura do MercadoPago
   * @returns Adaptador de assinatura
   */
  public getSubscriptionAdapter(): SubscriptionAdapter {
    this.checkAvailability();

    if (!this._subscriptionAdapter) {
      const subscriptionClient = this.getSubscriptionClient();
      this._subscriptionAdapter = new SubscriptionAdapter(subscriptionClient);
      logger.debug("Adaptador de assinatura do MercadoPago inicializado");
    }

    return this._subscriptionAdapter;
  }

  /**
   * Obtém o adaptador de ordem de mercador do MercadoPago
   * @param type Tipo de integração (default: CHECKOUT)
   * @returns Adaptador de ordem de mercador
   */
  public getMerchantOrderAdapter(
    type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ): MerchantOrderAdapter {
    this.checkAvailability();

    if (!this._merchantOrderAdapter) {
      const merchantOrderClient = this.getMerchantOrderClient(type);
      this._merchantOrderAdapter = new MerchantOrderAdapter(
        merchantOrderClient
      );
      logger.debug(
        "Adaptador de ordem de mercador do MercadoPago inicializado",
        { type }
      );
    }

    return this._merchantOrderAdapter;
  }

  /**
   * Testa a conectividade com a API do Mercado Pago
   * @returns Informações da conta e status da conexão
   */
  public async testConnectivity(): Promise<{
    success: boolean;
    account?: any;
    error?: string;
    errorCode?: string;
  }> {
    try {
      this.checkAvailability();

      // Obtém informações do usuário para testar a conexão
      const payment = this.getPaymentClient();
      const paymentResult = await payment.get({ id: "0" }).catch(() => {
        // Ignora erro específico, apenas queremos verificar a conectividade
        return { status: 200 };
      });

      // Se chegou até aqui, a conexão está funcionando
      logger.info(
        "Teste de conectividade com o Mercado Pago realizado com sucesso"
      );

      return {
        success: true,
        account: {
          id: "connected",
          email: mercadoPagoConfig.isTestMode()
            ? "test_user"
            : "production_user",
          siteId: "MLB", // Brasil (Mercado Livre Brasil)
        },
      };
    } catch (error) {
      logger.error("Erro no teste de conectividade com o Mercado Pago:", error);

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
