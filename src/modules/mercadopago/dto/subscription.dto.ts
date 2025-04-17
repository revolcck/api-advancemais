/**
 * DTOs para dados de assinatura
 */

/**
 * DTO para criação de assinatura
 */
export interface CreateSubscriptionDto {
  planId: string;
  paymentMethodId: string;
  couponId?: string;
  backUrl?: string;
  paymentCardId?: string;
  metadata?: Record<string, any>;
}

/**
 * DTO para dados recorrentes da assinatura
 */
export interface RecurringData {
  frequency: number; // Frequência de cobrança
  frequency_type: "days" | "months"; // Tipo de frequência
  transaction_amount: number; // Valor da cobrança
  currency_id: string; // Moeda (BRL)
  start_date?: string; // Data inicial (ISO)
  end_date?: string; // Data final (ISO)
}

/**
 * DTO para criação de assinatura no MercadoPago
 */
export interface SubscriptionCreationRequest {
  preapproval_plan_id?: string; // ID do plano associado
  reason: string; // Descrição da assinatura
  payer_email: string;
  auto_recurring: RecurringData;
  back_url?: string; // URL de retorno após pagamento
  status?: "authorized" | "pending" | "cancelled"; // Status inicial
  external_reference?: string; // Referência externa
  metadata?: Record<string, any>; // Metadados adicionais
}

/**
 * DTO para resposta de criação de assinatura
 */
export interface SubscriptionResponseDto {
  subscriptionId: string;
  mpSubscriptionId: string;
  status: string;
  initPoint: string;
}

/**
 * DTO para detalhes de assinatura
 */
export interface SubscriptionDetailsDto {
  id: string;
  mpSubscriptionId: string;
  status: string;
  startDate: Date;
  nextBillingDate: Date;
  plan: {
    id: string;
    name: string;
    price: number;
    interval: string;
  };
  paymentMethod: {
    id: string;
    type: string;
    name: string;
  };
  externalDetails?: {
    status: string;
    next_payment_date: string;
    init_point: string;
  } | null;
}

/**
 * DTO para verificação de assinatura ativa
 */
export interface SubscriptionCheckDto {
  hasActiveSubscription: boolean;
  subscription?: {
    id: string;
    planName: string;
    nextBillingDate: Date;
  } | null;
}

/**
 * DTO para cancelamento de assinatura
 */
export interface CancelSubscriptionDto {
  reason?: string;
}

/**
 * DTO para resposta de cancelamento
 */
export interface CancelSubscriptionResponseDto {
  canceled: boolean;
  message: string;
}
