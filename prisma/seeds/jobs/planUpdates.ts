import { SubscriptionPlan } from "@prisma/client";
import { SeedContext, prisma, upsertEntities } from "../utils";

/**
 * Estrutura dos dados de atualização dos planos
 */
interface PlanUpdate {
  name: string;
  maxJobOffers: number;
  featuredJobOffers: number;
  confidentialOffers: boolean;
  resumeAccess: boolean;
  allowPremiumFilters: boolean;
}

/**
 * Atualiza os planos de assinatura com limites de vagas e recursos relacionados
 *
 * @param context O contexto atual do seed
 * @returns Contexto atualizado com os planos atualizados
 */
export async function updateSubscriptionPlansWithJobLimits(
  context: SeedContext
): Promise<SeedContext> {
  console.log(
    "Atualizando planos de assinatura com recursos do sistema de vagas..."
  );

  // Verificar se já temos planos no contexto
  if (!context.subscriptionPlans || context.subscriptionPlans.length === 0) {
    console.log("Buscando planos de assinatura no banco de dados...");
    const plans = await prisma.subscriptionPlan.findMany();
    if (plans.length === 0) {
      console.warn(
        "Nenhum plano de assinatura encontrado. Execute o seed de planos primeiro."
      );
      return context;
    }
    context.subscriptionPlans = plans;
  }

  // Mapear planos pelo nome para facilitar a atualização
  const planMap = context.subscriptionPlans.reduce((map, plan) => {
    map[plan.name] = plan;
    return map;
  }, {} as Record<string, SubscriptionPlan>);

  // Definir os limites e recursos para cada plano
  const planUpdates: PlanUpdate[] = [
    {
      name: "Inicial",
      maxJobOffers: 3, // 3 vagas no plano Inicial
      featuredJobOffers: 0, // Sem vagas em destaque
      confidentialOffers: false, // Não permite vagas confidenciais
      resumeAccess: true, // Acesso básico à base de currículos
      allowPremiumFilters: false, // Sem filtros avançados
    },
    {
      name: "Intermediário",
      maxJobOffers: 10, // 10 vagas no plano Intermediário
      featuredJobOffers: 0, // Sem vagas em destaque
      confidentialOffers: false, // Não permite vagas confidenciais
      resumeAccess: true, // Acesso à base de currículos
      allowPremiumFilters: false, // Sem filtros avançados
    },
    {
      name: "Avançado",
      maxJobOffers: 20, // 20 vagas no plano Avançado
      featuredJobOffers: 0, // Sem vagas em destaque
      confidentialOffers: true, // Permite vagas confidenciais
      resumeAccess: true, // Acesso à base de currículos
      allowPremiumFilters: true, // Com filtros avançados
    },
    {
      name: "Destaque",
      maxJobOffers: -1, // ilimitado (-1 representa ilimitado)
      featuredJobOffers: 1, // 1 vaga em destaque
      confidentialOffers: true, // Permite vagas confidenciais
      resumeAccess: true, // Acesso completo à base de currículos
      allowPremiumFilters: true, // Com filtros avançados
    },
  ];

  // Atualizar cada plano existente com os novos limites
  const updatedPlans = await upsertEntities<SubscriptionPlan, PlanUpdate>(
    "Plano",
    planUpdates,
    async (update) => {
      const plan = planMap[update.name];

      // Se não encontrar o plano, pular
      if (!plan) {
        console.warn(
          `Plano "${update.name}" não encontrado. Pulando atualização.`
        );
        throw new Error(`Plano "${update.name}" não encontrado`);
      }

      // Atualizar o plano com os novos limites e recursos
      return prisma.subscriptionPlan.update({
        where: { id: plan.id },
        data: {
          maxJobOffers: update.maxJobOffers,
          featuredJobOffers: update.featuredJobOffers,
          confidentialOffers: update.confidentialOffers,
          resumeAccess: update.resumeAccess,
          allowPremiumFilters: update.allowPremiumFilters,
        },
      });
    },
    true // continuar mesmo se houver erro em algum plano
  );

  // Imprimir resumo das atualizações
  console.log(
    `${updatedPlans.length} planos atualizados com recursos do sistema de vagas`
  );

  // Adicionar detalhes específicos sobre cada plano
  updatedPlans.forEach((plan) => {
    console.log(
      `- Plano ${plan.name}: ${
        plan.maxJobOffers === -1
          ? "Vagas ilimitadas"
          : `${plan.maxJobOffers} vagas`
      }, ${plan.featuredJobOffers} em destaque`
    );
  });

  return {
    ...context,
    subscriptionPlans: updatedPlans,
  };
}
