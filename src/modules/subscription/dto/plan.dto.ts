/**
 * DTOs para planos de assinatura
 * @module modules/subscription/dto/plan.dto
 */

import { BillingInterval } from "@prisma/client";

/**
 * DTO para criação de plano de assinatura
 */
export class CreatePlanDTO {
  // Informações básicas do plano
  name: string;
  price: number;
  description?: string;
  features: Record<string, any>;

  // Detalhes de cobrança
  interval: BillingInterval;
  intervalCount: number;
  trialDays?: number;

  // Status e destaque
  isActive?: boolean;
  isPopular?: boolean;

  // ID do produto no MercadoPago
  mpProductId?: string;

  // Campos para sistema de vagas
  maxJobOffers?: number;
  featuredJobOffers?: number;
  confidentialOffers?: boolean;
  resumeAccess?: boolean;
  allowPremiumFilters?: boolean;
}

/**
 * DTO para atualização de plano de assinatura
 */
export class UpdatePlanDTO {
  // Informações básicas do plano
  name?: string;
  price?: number;
  description?: string;
  features?: Record<string, any>;

  // Detalhes de cobrança
  interval?: BillingInterval;
  intervalCount?: number;
  trialDays?: number;

  // Status e destaque
  isActive?: boolean;
  isPopular?: boolean;

  // ID do produto no MercadoPago
  mpProductId?: string;

  // Campos para sistema de vagas
  maxJobOffers?: number;
  featuredJobOffers?: number;
  confidentialOffers?: boolean;
  resumeAccess?: boolean;
  allowPremiumFilters?: boolean;
}

/**
 * DTO para resposta de plano de assinatura
 */
export class PlanResponseDTO {
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
}

/**
 * DTO para filtrar planos
 */
export class PlanFilterDTO {
  id?: string;
  name?: string;
  isActive?: boolean;
  isPopular?: boolean;
  priceMin?: number;
  priceMax?: number;
  interval?: BillingInterval;
}
