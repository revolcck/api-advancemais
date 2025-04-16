/**
 * Tipos específicos para o módulo de assinaturas
 * @module modules/subscription/types/subscription.types
 */

import {
  SubscriptionStatus,
  PaymentStatus,
  BillingInterval,
} from "@prisma/client";

/**
 * Tipo para um plano de assinatura detalhado
 */
export type PlanDetail = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  features: Record<string, any>;
  interval: BillingInterval;
  intervalCount: number;
  trialDays: number | null;
  isActive: boolean;
  isPopular: boolean;
  maxJobOffers: number | null;
  featuredJobOffers: number | null;
  confidentialOffers: boolean;
  resumeAccess: boolean;
  allowPremiumFilters: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Tipo para uma assinatura detalhada
 */
export type SubscriptionDetail = {
  id: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date | null;
  nextBillingDate: Date;
  canceledAt: Date | null;
  cancelReason: string | null;
  isPaused: boolean;
  pausedAt: Date | null;
  mpSubscriptionId: string | null;
  mpPreapprovalId: string | null;
  mpMerchantOrderId: string | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  renewalFailures: number;
  renewalAttemptDate: Date | null;
  metadataJson: Record<string, any> | null;
  couponId: string | null;
  discountAmount: number | null;
  originalPrice: number | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  planId: string;
  paymentMethodId: string;
  paymentCardId: string | null;
  checkoutSessionId: string | null;
  plan: PlanDetail;
  user: {
    id: string;
    email: string;
    userType: string;
    isActive: boolean;
    personalInfo?: {
      name: string;
      cpf: string;
      phone: string;
    } | null;
    companyInfo?: {
      companyName: string;
      tradeName: string;
      cnpj: string;
      phone: string;
    } | null;
  };
  paymentMethod: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    isActive: boolean;
  };
  paymentCard?: {
    id: string;
    cardHolderName: string;
    last4Digits: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
  } | null;
  coupon?: {
    id: string;
    code: string;
    name: string;
    discountType: string;
    discountValue: number;
    startDate: Date;
    endDate: Date;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    status: PaymentStatus;
    paymentDate: Date;
    description: string | null;
  }>;
};

/**
 * Tipo para uma evento de webhook processado
 */
export type ProcessedWebhookEvent = {
  id: string;
  eventType: string;
  eventId: string | null;
  processStatus: string;
  processedAt: Date | null;
  error: string | null;
  createdAt: Date;
  liveMode: boolean;
};

/**
 * Tipo para um método de pagamento
 */
export type PaymentMethodDetail = {
  id: string;
  type: string;
  name: string;
  description: string | null;
  isActive: boolean;
  mpPaymentTypeId: string | null;
  mpPaymentMethodId: string | null;
  processingFee: number | null;
  fixedFee: number | null;
  requiredFields: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Tipo para um cartão de pagamento
 */
export type PaymentCardDetail = {
  id: string;
  cardHolderName: string;
  last4Digits: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  tokenId: string | null;
  cardId: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

/**
 * Tipo para um pagamento
 */
export type PaymentDetail = {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentDate: Date;
  description: string | null;
  mpPaymentId: string | null;
  mpExternalReference: string | null;
  mpPreferenceId: string | null;
  mpMerchantOrderId: string | null;
  mpPaymentMethodId: string | null;
  mpPaymentTypeId: string | null;
  mpStatus: string | null;
  mpStatusDetail: string | null;
  gatewayResponse: Record<string, any> | null;
  notificationData: Record<string, any> | null;
  invoiceUrl: string | null;
  receiptUrl: string | null;
  failureReason: string | null;
  discountAmount: number | null;
  originalAmount: number | null;
  couponCode: string | null;
  attemptCount: number;
  lastAttempt: Date | null;
  refundedAt: Date | null;
  refundAmount: number | null;
  refundReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  subscriptionId: string;
};

/**
 * Tipo para uma sessão de checkout
 */
export type CheckoutSessionDetail = {
  id: string;
  status: string;
  expiresAt: Date;
  mpPreferenceId: string | null;
  mpCheckoutUrl: string | null;
  mpInitPoint: string | null;
  mpSandboxInitPoint: string | null;
  couponId: string | null;
  discountAmount: number | null;
  originalPrice: number | null;
  successUrl: string | null;
  cancelUrl: string | null;
  callbackUrl: string | null;
  metadataJson: Record<string, any> | null;
  planId: string;
  paymentMethodId: string;
  userId: string | null;
  pendingRegistrationId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
