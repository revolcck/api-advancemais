/**
 * DTOs para assinaturas
 * @module modules/subscription/dto/subscription.dto
 */

import { SubscriptionStatus, PaymentStatus } from "@prisma/client";

/**
 * DTO para criar uma nova assinatura
 */
export class CreateSubscriptionDTO {
  // Relacionamentos
  userId: string;
  planId: string;
  paymentMethodId: string;

  // Opcionais
  paymentCardId?: string;
  couponId?: string;

  // Campos MercadoPago
  mpSubscriptionId?: string;
  mpPreapprovalId?: string;

  // Config
  startDate?: Date;
  metadataJson?: Record<string, any>;
}

/**
 * DTO para atualizar uma assinatura
 */
export class UpdateSubscriptionDTO {
  // Status
  status?: SubscriptionStatus;

  // Método de pagamento
  paymentMethodId?: string;
  paymentCardId?: string;

  // Datas
  nextBillingDate?: Date;

  // Cancelamento
  canceledAt?: Date;
  cancelReason?: string;

  // Pausa
  isPaused?: boolean;
  pausedAt?: Date;

  // Mercado Pago
  mpSubscriptionId?: string;
  mpPreapprovalId?: string;
  mpMerchantOrderId?: string;

  // Dados adicionais
  metadataJson?: Record<string, any>;
}

/**
 * DTO para registrar um pagamento de assinatura
 */
export class SubscriptionPaymentDTO {
  subscriptionId: string;
  amount: number;
  currency?: string;
  status: PaymentStatus;
  description?: string;
  paymentDate: Date;

  // Campos MercadoPago
  mpPaymentId?: string;
  mpExternalReference?: string;
  mpPreferenceId?: string;
  mpMerchantOrderId?: string;
  mpPaymentMethodId?: string;
  mpPaymentTypeId?: string;
  mpStatus?: string;
  mpStatusDetail?: string;

  // Dados adicionais
  gatewayResponse?: Record<string, any>;

  // Descontos
  discountAmount?: number;
  originalAmount?: number;
  couponCode?: string;
}

/**
 * DTO para iniciar assinatura via MercadoPago
 */
export class InitSubscriptionDTO {
  // Informações do cliente
  userId: string;
  email: string;

  // Informações do plano
  planId: string;

  // Informações de pagamento
  paymentMethodId: string;
  paymentCardId?: string;

  // Cupom e descontos
  couponId?: string;

  // Dados adicionais
  backUrl?: string;
  metadataJson?: Record<string, any>;
}

/**
 * DTO para resposta de checkout de assinatura
 */
export class SubscriptionCheckoutResponseDTO {
  checkoutUrl: string;
  preferenceId?: string;
  subscriptionId?: string;
  expiresAt: Date;
  testMode: boolean;
}

/**
 * DTO para filtrar assinaturas
 */
export class SubscriptionFilterDTO {
  id?: string;
  userId?: string;
  planId?: string;
  status?: SubscriptionStatus;
  startDateFrom?: Date;
  startDateTo?: Date;
  nextBillingFrom?: Date;
  nextBillingTo?: Date;
  isActive?: boolean;
  isPaused?: boolean;
}
