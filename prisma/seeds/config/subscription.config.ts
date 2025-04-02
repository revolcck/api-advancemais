import { BillingInterval } from "@prisma/client";
import { JobsConfig, PlanFeatures, SubscriptionPlanConfig } from "./types";

/**
 * Configuração base para features de planos
 * Serve como template para evitar código repetitivo
 */
const createFeatures = (
  tagline: string,
  vacancies: number,
  featuredVacancy: boolean = false,
  advancedControl: boolean = false
): PlanFeatures => ({
  tagline,
  vacancies,
  advertisingDays: 30, // Padrão para todos os planos
  qualifiedCandidates: true, // Padrão para todos os planos
  basicControl: !advancedControl, // Básico quando não for avançado
  featuredVacancy,
  advancedControl,
  benefitsList: [
    `${vacancies === -1 ? "Vagas ilimitadas" : `${vacancies} vagas ativas`}`,
    "30 dias de divulgação",
    "Acesso a candidatos qualificados",
    `Painel de controle ${advancedControl ? "avançado" : "básico"}`,
    ...(featuredVacancy ? ["1 vaga em destaque"] : []),
  ],
});

/**
 * Configuração base para limits de vagas
 */
const createJobsConfig = (
  maxJobOffers: number,
  featuredJobOffers: number = 0,
  confidentialOffers: boolean = false,
  allowPremiumFilters: boolean = false
): JobsConfig => ({
  maxJobOffers,
  featuredJobOffers,
  confidentialOffers,
  resumeAccess: true, // Padrão para todos os planos
  allowPremiumFilters,
});

/**
 * Configurações dos planos de assinatura
 */
export const subscriptionConfig = {
  plans: [
    {
      name: "Inicial",
      price: 49.99,
      description:
        "Aumente a produtividade e a criatividade com o acesso expandido.",
      interval: BillingInterval.MONTHLY,
      intervalCount: 1,
      features: createFeatures("Comece a recrutar com eficiência", 3),
      jobsConfig: createJobsConfig(3),
      isActive: true,
      isPopular: false,
    },
    {
      name: "Intermediário",
      price: 74.99,
      description:
        "Aumente a produtividade e a criatividade com o acesso expandido.",
      interval: BillingInterval.MONTHLY,
      intervalCount: 1,
      features: createFeatures("Amplie seu alcance de recrutamento", 10),
      jobsConfig: createJobsConfig(10),
      isActive: true,
      isPopular: false,
    },
    {
      name: "Avançado",
      price: 99.99,
      description:
        "Aumente a produtividade e a criatividade com o acesso expandido.",
      interval: BillingInterval.MONTHLY,
      intervalCount: 1,
      features: createFeatures("Solução completa para grandes equipes", 20),
      jobsConfig: createJobsConfig(20, 0, true, true),
      isActive: true,
      isPopular: true,
    },
    {
      name: "Destaque",
      price: 199.99,
      description:
        "Aumente a produtividade e a criatividade com o acesso expandido.",
      interval: BillingInterval.MONTHLY,
      intervalCount: 1,
      features: createFeatures("Recrutamento sem limites", -1, true, true),
      jobsConfig: createJobsConfig(-1, 1, true, true),
      isActive: true,
      isPopular: false,
    },
  ] as SubscriptionPlanConfig[],
};
