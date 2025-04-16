/**
 * Interfaces para os planos de assinatura
 * @module modules/subscription/interfaces/plan.interface
 */

import { SubscriptionPlan, BillingInterval } from "@prisma/client";

/**
 * Interface para criar um plano de assinatura
 */
export interface ICreatePlanDTO {
  name: string;
  price: number;
  description?: string;
  features: Record<string, any>;
  interval: BillingInterval;
  intervalCount: number;
  trialDays?: number;
  isActive?: boolean;
  isPopular?: boolean;
  mpProductId?: string;

  // Campos para sistema de vagas
  maxJobOffers?: number;
  featuredJobOffers?: number;
  confidentialOffers?: boolean;
  resumeAccess?: boolean;
  allowPremiumFilters?: boolean;
}

/**
 * Interface para atualizar um plano de assinatura
 */
export interface IUpdatePlanDTO {
  name?: string;
  price?: number;
  description?: string;
  features?: Record<string, any>;
  interval?: BillingInterval;
  intervalCount?: number;
  trialDays?: number;
  isActive?: boolean;
  isPopular?: boolean;
  mpProductId?: string;

  // Campos para sistema de vagas
  maxJobOffers?: number;
  featuredJobOffers?: number;
  confidentialOffers?: boolean;
  resumeAccess?: boolean;
  allowPremiumFilters?: boolean;
}

/**
 * Interface para o serviço de planos de assinatura
 */
export interface IPlanService {
  createPlan(data: ICreatePlanDTO): Promise<SubscriptionPlan>;
  updatePlan(id: string, data: IUpdatePlanDTO): Promise<SubscriptionPlan>;
  deletePlan(id: string): Promise<SubscriptionPlan>;
  getPlanById(id: string): Promise<SubscriptionPlan | null>;
  getAllPlans(includeInactive?: boolean): Promise<SubscriptionPlan[]>;
  getActivePlans(): Promise<SubscriptionPlan[]>;
  togglePlanStatus(id: string, active: boolean): Promise<SubscriptionPlan>;
}
