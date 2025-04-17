import { MercadoPagoPaymentStatus } from "../../dto/payment.dto";

/**
 * Interface para operações de pagamento core
 */
export interface IPaymentService {
  /**
   * Cria uma preferência de pagamento
   */
  createPaymentPreference(
    data: PaymentPreferenceRequest,
    userId: string
  ): Promise<PaymentPreferenceResponse>;

  /**
   * Obtém detalhes de um pagamento pelo ID
   */
  getPaymentDetails(paymentId: string): Promise<PaymentDetails>;

  /**
   * Verifica se um pagamento foi aprovado
   */
  isPaymentApproved(paymentId: string): Promise<boolean>;

  /**
   * Registra uma notificação de pagamento
   */
  registerPaymentNotification(
    data: NotificationData,
    rawData: any
  ): Promise<{ id: string }>;

  /**
   * Cancela um pagamento pendente
   */
  cancelPayment(paymentId: string): Promise<{ id: string; status: string }>;

  /**
   * Reembolsa um pagamento aprovado
   */
  refundPayment(paymentId: string): Promise<{ id: string; status: string }>;

  /**
   * Obtém configurações de pagamento para o frontend
   */
  getPaymentConfig(): PaymentConfig;
}

/**
 * Interface para dados de cliente
 */
export interface CustomerInfo {
  name: string;
  email: string;
  identification?: {
    type: string;
    number: string;
  };
  phone?: {
    area_code: string;
    number: string;
  };
  address?: {
    zip_code: string;
    street_name: string;
    street_number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

/**
 * Interface para item de compra
 */
export interface PurchaseItem {
  id: string;
  title: string;
  description: string;
  picture_url?: string;
  category_id?: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

/**
 * Interface para requisição de preferência de pagamento
 */
export interface PaymentPreferenceRequest {
  items: PurchaseItem[];
  payer: CustomerInfo;
  back_urls?: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: string;
  payment_methods?: {
    excluded_payment_methods?: { id: string }[];
    excluded_payment_types?: { id: string }[];
    installments?: number;
  };
  notification_url?: string;
  external_reference?: string;
  statement_descriptor?: string;
  expires?: boolean;
  expiration_date_from?: string;
  expiration_date_to?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface para resposta de preferência de pagamento
 */
export interface PaymentPreferenceResponse {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
}

/**
 * Interface para detalhes de pagamento
 */
export interface PaymentDetails {
  id: string;
  status: MercadoPagoPaymentStatus;
  status_detail: string;
  payment_method_id: string;
  payment_type_id: string;
  transaction_amount: number;
  installments: number;
  date_created: string;
  date_approved?: string;
  date_last_updated: string;
  currency_id: string;
  description: string;
  external_reference?: string;
  payer: {
    id?: string;
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  metadata?: Record<string, any>;
  additional_info?: any;
  fee_details?: any[];
  charges_details?: any[];
  refunds?: any[];
}

/**
 * Interface para dados de notificação
 */
export interface NotificationData {
  source: string;
  eventType: string;
  eventId: string;
  apiVersion?: string;
  liveMode: boolean;
}

/**
 * Interface para configuração de pagamento frontend
 */
export interface PaymentConfig {
  publicKey: string;
  isProduction: boolean;
}
