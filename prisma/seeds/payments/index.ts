import { SeedContext, seedManager } from "../utils";
import { seedSubscriptionPlans } from "./subscriptionPlans";
import { seedPaymentMethods } from "./paymentMethods";
import { seedCoupons } from "./coupons";

/**
 * Registra os seeds do domínio de pagamentos
 */
export function registerPaymentSeeds(): void {
  // Registrar seed de Planos de Assinatura (sem dependências)
  seedManager.registerSeed("subscriptionPlans", seedSubscriptionPlans);

  // Registrar seed de Métodos de Pagamento (sem dependências)
  seedManager.registerSeed("paymentMethods", seedPaymentMethods);

  // Registrar seed de Cupons (depende do adminUser)
  seedManager.registerSeed("coupons", seedCoupons, ["adminUser"]);
}

/**
 * Função para executar todos os seeds de pagamento
 */
export async function seedPaymentSystem(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Iniciando seed do sistema de pagamentos...");

  try {
    // Executar seeds em ordem
    let currentContext = { ...context };

    // Executar os seeds um por um
    currentContext = await seedManager.executeSeed("subscriptionPlans");
    currentContext = await seedManager.executeSeed("paymentMethods");
    currentContext = await seedManager.executeSeed("coupons");

    console.log("Seed do sistema de pagamentos finalizado!");
    return currentContext;
  } catch (error) {
    console.error("Erro durante seed do sistema de pagamentos:", error);
    throw error;
  }
}

// Re-exportações para acesso mais direto
export * from "./subscriptionPlans";
export * from "./paymentMethods";
export * from "./coupons";
