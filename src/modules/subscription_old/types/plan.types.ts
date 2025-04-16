/**
 * Tipos relacionados a planos de assinatura
 * @module modules/subscription/types/plan.types
 */

import { BillingInterval } from "@prisma/client";

/**
 * Intervalo de cobrança formatado para exibição
 */
export type PlanIntervalDisplay = {
  label: string;
  value: BillingInterval;
  description: string;
};

/**
 * Configurações de um plano de vagas
 */
export type PlanJobFeatures = {
  maxJobOffers: number;
  featuredJobOffers: number;
  confidentialOffers: boolean;
  resumeAccess: boolean;
  allowPremiumFilters: boolean;
};

/**
 * Feature de um plano com sua descrição
 */
export type PlanFeature = {
  id: string;
  name: string;
  description: string;
  included: boolean;
  highlight?: boolean;
  value?: string | number | boolean;
};

/**
 * Comparativo entre planos para exibição
 */
export type PlanComparison = {
  categories: string[];
  features: {
    [category: string]: {
      name: string;
      plans: {
        [planId: string]: {
          included: boolean;
          value?: string | number | boolean;
          highlight?: boolean;
        };
      };
    }[];
  };
  plans: {
    id: string;
    name: string;
    price: number;
    isPopular: boolean;
    interval: BillingInterval;
    intervalCount: number;
  }[];
};

/**
 * Estatísticas de uso de planos
 */
export type PlanUsageStats = {
  planId: string;
  planName: string;
  activeSubscriptions: number;
  totalSubscriptions: number;
  revenue: {
    monthly: number;
    annual: number;
    total: number;
  };
  avgSubscriptionDuration: number; // em dias
  topFeatureUsage: {
    [feature: string]: number;
  };
};

/**
 * Intervalo de tempo para estatísticas
 */
export type TimeRange =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "annual"
  | "custom";

/**
 * Preço formatado do plano
 */
export type FormattedPrice = {
  currency: string;
  amount: number;
  formattedValue: string;
  intervalLabel: string;
  discountedPrice?: {
    amount: number;
    formattedValue: string;
    discountPercentage: number;
  };
};
