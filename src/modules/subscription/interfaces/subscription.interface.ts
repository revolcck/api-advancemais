/**
 * Interfaces para assinaturas
 * @module modules/subscription/interfaces/subscription.interface
 */

import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  Subscription,
  SubscriptionStatus,
} from "@prisma/client";

/**
 * Interface para criar uma nova assinatura
 */
export interface ICreateSubscriptionDTO {
  userId: string;
  planId: string;
  paymentMethodId: string;
  paymentCardId?: string;
  couponId?: string;
  mpSubscriptionId?: string;
  mpPreapprovalId?: string;
  startDate?: Date;
  metadataJson?: Record<string, any>;
}

/**
 * Interface para atualizar uma assinatura
 */
export interface IUpdateSubscriptionDTO {
  status?: SubscriptionStatus;
  paymentMethodId?: string;
  paymentCardId?: string;
  nextBillingDate?: Date;
  canceledAt?: Date;
  cancelReason?: string;
  isPaused?: boolean;
  pausedAt?: Date;
  metadataJson?: Record<string, any>;
  mpSubscriptionId?: string;
  mpPreapprovalId?: string;
  mpMerchantOrderId?: string;
}

/**
 * Interface para pagamento de assinatura
 */
export interface ISubscriptionPaymentDTO {
  subscriptionId: string;
  amount: number;
  currency?: string;
  status: PaymentStatus;
  description?: string;
  paymentDate: Date;
  mpPaymentId?: string;
  mpExternalReference?: string;
  mpPreferenceId?: string;
  mpMerchantOrderId?: string;
  mpPaymentMethodId?: string;
  mpPaymentTypeId?: string;
  mpStatus?: string;
  mpStatusDetail?: string;
  gatewayResponse?: Record<string, any>;
  discountAmount?: number;
  originalAmount?: number;
  couponCode?: string;
}

/**
 * Interface para renovação de assinatura
 */
export interface IRenewalInfo {
  subscription: Subscription;
  success: boolean;
  payment?: Payment;
  error?: string;
  newStatus?: SubscriptionStatus;
}

/**
 * Interface para o serviço de assinaturas
 */
export interface ISubscriptionService {
  createSubscription(data: ICreateSubscriptionDTO): Promise<Subscription>;
  getSubscriptionById(id: string): Promise<Subscription | null>;
  getSubscriptionsByUserId(userId: string): Promise<Subscription[]>;
  updateSubscription(
    id: string,
    data: IUpdateSubscriptionDTO
  ): Promise<Subscription>;
  cancelSubscription(id: string, reason?: string): Promise<Subscription>;
  pauseSubscription(id: string): Promise<Subscription>;
  resumeSubscription(id: string): Promise<Subscription>;
  renewSubscription(subscriptionId: string): Promise<IRenewalInfo>;
  processPayment(paymentData: ISubscriptionPaymentDTO): Promise<Payment>;
  getAvailablePaymentMethods(): Promise<PaymentMethod[]>;
  updateSubscriptionFromMercadoPago(
    mpSubscriptionId: string
  ): Promise<Subscription | null>;
}
