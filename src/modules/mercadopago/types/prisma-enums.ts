/**
 * Enums para compatibilidade com Prisma
 * Estes enums servem como substitutos para os tipos que deveriam vir do @prisma/client
 */

export enum BillingInterval {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  SEMIANNUAL = "SEMIANNUAL",
  ANNUAL = "ANNUAL",
}

export enum SubscriptionStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  CANCELED = "CANCELED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  PAST_DUE = "PAST_DUE",
  TRIAL = "TRIAL",
  EXPIRED = "EXPIRED",
  ON_HOLD = "ON_HOLD",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
  IN_PROCESS = "IN_PROCESS",
  IN_MEDIATION = "IN_MEDIATION",
  CHARGED_BACK = "CHARGED_BACK",
}

/**
 * Interface para substituir o tipo SubscriptionPlan do Prisma
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number | any; // Usando any para compatibilidade com Decimal do Prisma
  description: string | null;
  features: any;
  interval: string | BillingInterval;
  intervalCount: number;
  trialDays: number | null;
  isActive: boolean;
  isPopular: boolean;
  maxJobOffers: number | null;
  featuredJobOffers: number | null;
  confidentialOffers: boolean;
  resumeAccess: boolean;
  allowPremiumFilters: boolean;
  mpProductId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
