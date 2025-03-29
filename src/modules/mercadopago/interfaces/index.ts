/**
 * Interfaces para o módulo MercadoPago
 *
 * @module modules/mercadopago/interfaces
 */

// ================ Interfaces de Pagamento ================

/**
 * Status possíveis de um pagamento
 */
export enum PaymentStatus {
  PENDING = "pending",
  APPROVED = "approved",
  AUTHORIZED = "authorized",
  IN_PROCESS = "in_process",
  IN_MEDIATION = "in_mediation",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
  CHARGED_BACK = "charged_back",
}

/**
 * Métodos de pagamento suportados
 */
export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  BANK_TRANSFER = "bank_transfer",
  PIX = "pix",
  BOLETO = "boleto",
  ACCOUNT_MONEY = "account_money",
}

/**
 * Detalhes de cartão para pagamento
 */
export interface CardDetails {
  token: string;
  installments: number;
  paymentMethodId: string;
  issuerId?: string;
}

/**
 * Item em um pagamento
 */
export interface PaymentItem {
  id: string;
  title: string;
  description?: string;
  pictureUrl?: string;
  categoryId?: string;
  quantity: number;
  unitPrice: number;
  currencyId?: string;
}

// ================ Interfaces de Assinatura ================

/**
 * Status possíveis de uma assinatura
 */
export enum SubscriptionStatus {
  PENDING = "pending",
  AUTHORIZED = "authorized",
  PAUSED = "paused",
  CANCELLED = "cancelled",
  ENDED = "ended",
}

/**
 * Frequência de cobrança para assinaturas
 */
export enum BillingFrequency {
  DAYS = "days",
  MONTHS = "months",
}

/**
 * Ciclo de faturamento para assinatura
 */
export interface BillingCycle {
  frequency: number;
  frequencyType: BillingFrequency;
  startDate?: string;
  endDate?: string;
  repetitions?: number;
}

// ================ Interfaces de Webhook ================

/**
 * Tipos de notificações webhook suportados pelo MercadoPago
 */
export enum WebhookTopicType {
  PAYMENT = "payment",
  MERCHANT_ORDER = "merchant_order",
  PLAN = "plan",
  SUBSCRIPTION = "subscription",
  INVOICE = "invoice",
  POINT_INTEGRATION_WIRED = "point_integration_wired",
}

// ================ Interfaces da Aplicação ================

/**
 * Interface para serviço de pagamento
 */
export interface IPaymentService {
  createPayment(data: any, userId?: string): Promise<any>;
  getPayment(paymentId: string | number): Promise<any>;
  refundPayment(
    paymentId: string | number,
    amount?: number,
    userId?: string
  ): Promise<any>;
  capturePayment(paymentId: string | number, userId?: string): Promise<any>;
  searchPayments(criteria: any): Promise<any>;
}

/**
 * Interface para serviço de assinatura
 */
export interface ISubscriptionService {
  createSubscription(data: any, userId?: string): Promise<any>;
  getSubscription(subscriptionId: string): Promise<any>;
  updateSubscription(
    subscriptionId: string,
    data: any,
    userId?: string
  ): Promise<any>;
  cancelSubscription(subscriptionId: string, userId?: string): Promise<any>;
  pauseSubscription(subscriptionId: string, userId?: string): Promise<any>;
  resumeSubscription(subscriptionId: string, userId?: string): Promise<any>;
  searchSubscriptions(criteria: any): Promise<any>;
}

/**
 * Interface para serviço de preferência de pagamento
 */
export interface IPreferenceService {
  createPreference(data: any, userId?: string): Promise<any>;
  getPreference(preferenceId: string): Promise<any>;
  updatePreference(
    preferenceId: string,
    data: any,
    userId?: string
  ): Promise<any>;
  searchPreferences(criteria: any): Promise<any>;
}

/**
 * Interface para serviço de webhook
 */
export interface IWebhookService {
  processWebhook(notification: any): Promise<any>;
  verifySignature(payload: string, signature: string): boolean;
}
