/**
 * Interfaces principais para o módulo MercadoPago
 * @module modules/mercadopago/interfaces
 */

// Reexportar tipos principais de cada categoria
export * from "../types/common.types";
export * from "../types/payment.types";
export * from "../types/subscription.types";

/**
 * Interface para o serviço de autenticação do MercadoPago
 */
export interface IMercadoPagoAuthService {
  /**
   * Obtém o token de acesso para as APIs do MercadoPago
   */
  getAccessToken(): string;

  /**
   * Obtém a chave pública para uso no frontend
   */
  getPublicKey(): string;

  /**
   * Verifica se o serviço está em modo de teste
   */
  isTestMode(): boolean;
}

/**
 * Interface para o serviço core do MercadoPago
 */
export interface IMercadoPagoCoreService {
  /**
   * Testa a conectividade com a API do MercadoPago
   */
  testConnectivity(): Promise<{
    success: boolean;
    account?: any;
    error?: string;
    errorCode?: string;
  }>;

  /**
   * Formata um erro do MercadoPago para log e retorno
   */
  formatError(
    error: any,
    operation: string
  ): { message: string; code: string; details: any };

  /**
   * Obtém o adaptador de pagamento
   */
  getPaymentAdapter(type?: any): any;

  /**
   * Obtém o adaptador de preferência
   */
  getPreferenceAdapter(type?: any): any;

  /**
   * Obtém o adaptador de assinatura
   */
  getSubscriptionAdapter(): any;

  /**
   * Obtém o adaptador de ordem de mercador
   */
  getMerchantOrderAdapter(type?: any): any;
}

/**
 * Interface para validação de webhook
 */
export interface IWebhookValidator {
  /**
   * Verifica a assinatura do webhook
   */
  verifySignature(payload: string, signature: string, secret: string): boolean;
}
