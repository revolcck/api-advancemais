import { BillingInterval, UserType } from "@prisma/client";
import { SeedGroupConfig } from "../utils/types";

/**
 * Tipos para configurações de planos de assinatura
 */
export interface PlanFeatures {
  tagline: string;
  vacancies: number;
  advertisingDays: number;
  qualifiedCandidates: boolean;
  basicControl: boolean;
  featuredVacancy: boolean;
  advancedControl: boolean;
  benefitsList: string[];
}

export interface JobsConfig {
  maxJobOffers: number;
  featuredJobOffers: number;
  confidentialOffers: boolean;
  resumeAccess: boolean;
  allowPremiumFilters: boolean;
}

export interface SubscriptionPlanConfig {
  name: string;
  price: number;
  description: string;
  interval: BillingInterval;
  intervalCount: number;
  features: PlanFeatures;
  jobsConfig: JobsConfig;
  isActive: boolean;
  isPopular: boolean;
}

/**
 * Tipos para configurações de cupons
 */
export interface CouponConfig {
  code: string;
  name: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  validityDays: number;
  usageLimit: number;
  perUserLimit: number;
  requiresUserAccount: boolean;
  customMessage: string;
  appliesToAllPlans: boolean;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  onlyFirstPurchase?: boolean;
  userTypeLimitation?: UserType;
  restrictedToPlans?: string[];
  billingIntervals?: BillingInterval[];
}

/**
 * Tipo para configuração de administrador
 */
export interface AdminConfig {
  email: string;
  password: string;
  matricula: string;
  name: string;
  cpf: string;
}

/**
 * Tipo para configuração de papéis/funções
 */
export interface RoleConfig {
  name: string;
  level: number;
  status: number;
  description: string;
}

/**
 * Tipo para constantes de referência a papéis
 */
export interface RolesConstants {
  ADMIN: string;
  PROFESSOR: string;
  ALUNO: string;
  EMPRESA: string;
  SETOR_PEDAGOGICO: string;
  RECRUTADORES: string;
  RH: string;
  ADMINISTRADOR: string;
}

/**
 * Tipo para configuração de grupos de seeds
 */
export interface SeedGroupsConfig {
  [key: string]: SeedGroupConfig;
}
