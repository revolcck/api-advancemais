/**
 * DTOs para dados de pagamento
 */

/**
 * Enum para status de pagamento retornados pelo MercadoPago
 */
export enum MercadoPagoPaymentStatus {
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
 * Enum para tipos de pagamento suportados pelo MercadoPago
 */
export enum MercadoPagoPaymentType {
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  TICKET = "ticket", // Boleto
  BANK_TRANSFER = "bank_transfer",
  PIX = "pix",
}

/**
 * DTO para criação de pagamento de curso
 */
export interface CreateCoursePaymentDto {
  courseId: string;
  paymentMethodId: string;
  couponId?: string;
  installments?: number;
  paymentCardId?: string;
}

/**
 * DTO para resposta de criação de pagamento
 */
export interface PaymentResponseDto {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
  checkoutId: string;
}

/**
 * DTO para verificação de status de pagamento
 */
export interface PaymentStatusDto {
  status: string;
  courseId: string;
  paymentId: string;
  paymentStatus?: string;
}

/**
 * DTO para configuração de pagamento
 */
export interface PaymentConfigDto {
  publicKey: string;
  isProduction: boolean;
  methods: string[];
  installments?: {
    maxInstallments: number;
    freeInstallments: number;
  };
}
