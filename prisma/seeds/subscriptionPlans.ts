import { BillingInterval, SubscriptionPlan } from "@prisma/client";
import { SeedContext, prisma } from "./utils";

/**
 * Seed para criar planos de assinatura
 */
export async function seedSubscriptionPlans(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando planos de assinatura...");

  const subscriptionPlans = [
    {
      name: "Inicial",
      price: 49.99,
      description:
        "Aumente a produtividade e a criatividade com o acesso expandido.",
      interval: BillingInterval.MONTHLY,
      intervalCount: 1,
      features: {
        tagline: "Comece a recrutar com eficiência",
        vacancies: 3,
        advertisingDays: 30,
        qualifiedCandidates: true,
        basicControl: true,
        featuredVacancy: false,
        advancedControl: false,
        benefitsList: [
          "3 vagas ativas",
          "30 dias de divulgação",
          "Acesso a candidatos qualificados",
          "Painel de controle básico",
        ],
      },
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
      features: {
        tagline: "Amplie seu alcance de recrutamento",
        vacancies: 10,
        advertisingDays: 30,
        qualifiedCandidates: true,
        basicControl: true,
        featuredVacancy: false,
        advancedControl: false,
        benefitsList: [
          "10 vagas ativas",
          "30 dias de divulgação",
          "Acesso a candidatos qualificados",
          "Painel de controle básico",
        ],
      },
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
      features: {
        tagline: "Solução completa para grandes equipes",
        vacancies: 20,
        advertisingDays: 30,
        qualifiedCandidates: true,
        basicControl: true,
        featuredVacancy: false,
        advancedControl: false,
        benefitsList: [
          "20 vagas ativas",
          "30 dias de divulgação",
          "Acesso a candidatos qualificados",
          "Painel de controle básico",
        ],
      },
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
      features: {
        tagline: "Recrutamento sem limites",
        vacancies: -1, // -1 representa vagas ilimitadas
        advertisingDays: 30,
        qualifiedCandidates: true,
        basicControl: false, // Não tem painel básico, mas avançado
        featuredVacancy: true,
        advancedControl: true,
        benefitsList: [
          "Vagas ilimitadas",
          "30 dias de divulgação",
          "Acesso a candidatos qualificados",
          "Painel de controle avançado",
          "1 vaga em destaque",
        ],
      },
      isActive: true,
      isPopular: false,
    },
  ];

  // Definindo explicitamente o tipo do array
  const createdPlans: SubscriptionPlan[] = [];

  for (const plan of subscriptionPlans) {
    const createdPlan = await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(`Plano criado: ${createdPlan.name} - R$ ${createdPlan.price}`);
    createdPlans.push(createdPlan);
  }

  return {
    ...context,
    subscriptionPlans: createdPlans,
  };
}
