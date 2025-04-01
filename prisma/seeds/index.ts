import { SeedContext, runSeedGroup } from "./utils";
import { seedRoles } from "./roles";
import { seedUsers } from "./users";
import { seedSubscriptionPlans } from "./subscriptionPlans";
import { seedPaymentMethods } from "./paymentMethods";
import { seedCoupons } from "./coupons";
import { seedAva } from "./ava";

// Organizar os seeds por domínio funcional
const seedGroups = {
  // Core seeds - base do sistema
  core: [
    { name: "Roles", fn: seedRoles },
    { name: "Usuários", fn: seedUsers },
  ],

  // Seeds relacionados a pagamentos
  payments: [
    { name: "Planos de Assinatura", fn: seedSubscriptionPlans },
    { name: "Métodos de Pagamento", fn: seedPaymentMethods },
    { name: "Cupons", fn: seedCoupons },
  ],

  // Seeds relacionados ao AVA
  ava: [{ name: "AVA (Ambiente Virtual de Aprendizagem)", fn: seedAva }],
};

/**
 * Executa todos os seeds na ordem correta
 */
export async function runAllSeeds(): Promise<SeedContext> {
  console.log("Iniciando execução de todos os seeds...");

  // Objeto de contexto inicial vazio
  let context: SeedContext = {};

  // Executar grupos de seeds em ordem
  try {
    // Seeds da estrutura básica do sistema
    context = await runSeedGroup("Core", seedGroups.core, context);

    // Seeds de pagamentos e assinaturas
    context = await runSeedGroup("Payments", seedGroups.payments, context);

    // Seeds do Ambiente Virtual de Aprendizagem
    context = await runSeedGroup("AVA", seedGroups.ava, context);

    console.log("\nTodos os seeds foram executados com sucesso!");
    return context;
  } catch (error) {
    console.error("\nFalha na execução dos seeds:", error);
    throw error;
  }
}
