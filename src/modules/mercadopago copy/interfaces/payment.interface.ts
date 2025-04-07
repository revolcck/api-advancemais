/**
 * Interfaces para pagamentos via MercadoPago
 * @module modules/mercadopago/interfaces/payment.interface
 */

/**
 * Métodos de pagamento suportados pelo MercadoPago
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
 * Interface para dados de cartão de crédito
 */
export interface CreditCardData {
  token: string;
  installments: number;
  paymentMethodId: string;
  issuerId?: string;
}

/**
 * Interface para dados de cartão de débito
 */
export interface DebitCardData {
  token: string;
  paymentMethodId: string;
  issuerId?: string;
}

/**
 * Interface para dados de transferência bancária
 */
export interface BankTransferData {
  paymentMethodId: string;
  bankId?: string;
}

/**
 * Interface para dados de PIX
 */
export interface PixData {
  payerEmail: string;
  payerFirstName: string;
  payerLastName: string;
  payerIdentification: {
    type: string;
    number: string;
  };
}

/**
 * Interface para dados de pagamento com boleto
 */
export interface BoletoData {
  payerEmail: string;
  payerFirstName: string;
  payerLastName: string;
  payerIdentification: {
    type: string;
    number: string;
  };
}

/**
 * Interface para item em um pagamento
 */
export interface PaymentItem {
  id: string;
  title: string;
  description?: string;
  pictureUrl?: string;
  categoryId?: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Interface para endereço do pagador
 */
export interface PayerAddress {
  zipCode: string;
  streetName: string;
  streetNumber: string;
  neighborhood?: string;
  city: string;
  federalUnit: string;
}

/**
 * Interface para telefone do pagador
 */
export interface PayerPhone {
  areaCode: string;
  number: string;
}

/**
 * Interface para informações do pagador
 */
export interface PayerInfo {
  firstName: string;
  lastName: string;
  email: string;
  identification?: {
    type: string;
    number: string;
  };
  address?: PayerAddress;
  phone?: PayerPhone;
}

/**
 * Interface para criação de pagamento
 */
export interface CreatePaymentRequest {
  transactionAmount: number;
  description: string;
  paymentMethodId: string;
  token?: string;
  installments?: number;
  issuerId?: string;
  payer: PayerInfo;
  additionalInfo?: {
    items?: PaymentItem[];
    shipments?: any;
    [key: string]: any;
  };
  externalReference?: string;
  notificationUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface para resposta de criação de pagamento
 */
export interface PaymentResponse {
  id: number;
  status: PaymentStatus;
  statusDetail: string;
  externalReference?: string;
  dateCreated: string;
  dateApproved?: string;
  paymentMethodId: string;
  paymentTypeId: string;
  transactionAmount: number;
  installments: number;
  processingMode: string;
  issuerId?: string;
  payer: {
    id?: string;
    email: string;
    identification?: {
      type: string;
      number: string;
    };
    type?: string;
  };
  metadata?: Record<string, any>;
  additionalInfo?: Record<string, any>;
  feeDetails?: Array<{
    type: string;
    amount: number;
    feePayer: string;
  }>;
  chargesDetails?: Array<{
    name: string;
    type: string;
    amount: number;
  }>;
  captureAmount?: number;
  captured?: boolean;
}

/**
 * Interface para refund (devolução) de pagamento
 */
export interface RefundRequest {
  amount?: number;
}

/**
 * Interface para resposta de refund
 */
export interface RefundResponse {
  id: number;
  paymentId: number;
  amount: number;
  source: string;
  dateCreated: string;
  status: string;
}
