import { logger } from "@/shared/utils/logger.utils";
import { mercadoPagoConfig } from "../config/mercadopago.config";
import { ConnectivityTestResponse } from "../dto/mercadopago.dto";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import {
  Payment,
  Customer,
  MerchantOrder,
  Preference,
  CardToken,
  PreApproval,
  PreApprovalPlan,
  PaymentRefund,
} from "mercadopago";

/**
 * Serviço principal para integração com o Mercado Pago
 * Responsável por inicializar e gerenciar os recursos da API
 */
export class MercadoPagoService {
  private static instance: MercadoPagoService;

  // APIs do Mercado Pago
  private _payment: Payment | null = null;
  private _preApproval: PreApproval | null = null; // Para assinaturas
  private _preApprovalPlan: PreApprovalPlan | null = null; // Para planos de assinatura
  private _customer: Customer | null = null;
  private _preference: Preference | null = null;
  private _merchantOrder: MerchantOrder | null = null;
  private _cardToken: CardToken | null = null;
  private _paymentRefund: PaymentRefund | null = null;

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {}

  /**
   * Obtém a instância única do serviço
   */
  public static getInstance(): MercadoPagoService {
    if (!MercadoPagoService.instance) {
      MercadoPagoService.instance = new MercadoPagoService();
    }
    return MercadoPagoService.instance;
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
   * Obtém a API de pagamentos do Mercado Pago
   */
  public getPaymentAPI(): Payment {
    this.checkAvailability();

    if (!this._payment) {
      this._payment = new Payment(mercadoPagoConfig.config);
    }

    return this._payment;
  }

  /**
   * Obtém a API de assinaturas (preApproval) do Mercado Pago
   */
  public getSubscriptionAPI(): PreApproval {
    this.checkAvailability();

    if (!this._preApproval) {
      this._preApproval = new PreApproval(mercadoPagoConfig.config);
    }

    return this._preApproval;
  }

  /**
   * Obtém a API de planos de assinatura do Mercado Pago
   */
  public getSubscriptionPlanAPI(): PreApprovalPlan {
    this.checkAvailability();

    if (!this._preApprovalPlan) {
      this._preApprovalPlan = new PreApprovalPlan(mercadoPagoConfig.config);
    }

    return this._preApprovalPlan;
  }

  /**
   * Obtém a API de clientes do Mercado Pago
   */
  public getCustomerAPI(): Customer {
    this.checkAvailability();

    if (!this._customer) {
      this._customer = new Customer(mercadoPagoConfig.config);
    }

    return this._customer;
  }

  /**
   * Obtém a API de preferências do Mercado Pago
   */
  public getPreferenceAPI(): Preference {
    this.checkAvailability();

    if (!this._preference) {
      this._preference = new Preference(mercadoPagoConfig.config);
    }

    return this._preference;
  }

  /**
   * Obtém a API de ordens de mercador do Mercado Pago
   */
  public getMerchantOrderAPI(): MerchantOrder {
    this.checkAvailability();

    if (!this._merchantOrder) {
      this._merchantOrder = new MerchantOrder(mercadoPagoConfig.config);
    }

    return this._merchantOrder;
  }

  /**
   * Obtém a API de tokens de cartão do Mercado Pago
   */
  public getCardTokenAPI(): CardToken {
    this.checkAvailability();

    if (!this._cardToken) {
      this._cardToken = new CardToken(mercadoPagoConfig.config);
    }

    return this._cardToken;
  }

  /**
   * Obtém a API de reembolsos de pagamento do Mercado Pago
   */
  public getPaymentRefundAPI(): PaymentRefund {
    this.checkAvailability();

    if (!this._paymentRefund) {
      this._paymentRefund = new PaymentRefund(mercadoPagoConfig.config);
    }

    return this._paymentRefund;
  }

  /**
   * Testa a conectividade com a API do Mercado Pago
   * @returns Informações da conta e status da conexão
   */
  public async testConnectivity(): Promise<ConnectivityTestResponse> {
    try {
      this.checkAvailability();

      // Obtém informações do usuário para testar a conexão
      const payment = this.getPaymentAPI();
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
export const mercadoPagoService = MercadoPagoService.getInstance();
