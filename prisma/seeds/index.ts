import { seedManager } from "./utils";
import { CONFIG } from "./config";

// Importar as funções de registro de cada domínio
import { registerCoreSeeds, seedCoreSystem } from "./core";
import { seedSubscriptionPlans } from "./payments/subscriptionPlans";
import { seedPaymentMethods } from "./payments/paymentMethods";
import { seedCoupons } from "./payments/coupons";
import { seedAva } from "./ava";
import { seedAllCertificates } from "./certificates";
import { seedJobSystem } from "./jobs";

/**
 * Registra todos os seeds disponíveis no sistema
 */
export function registerAllSeeds(): void {
  // Core - estrutura básica (roles, adminUser, users)
  registerCoreSeeds();

  // Payments - sistema de pagamentos (registrados individualmente)
  seedManager.registerSeed("subscriptionPlans", seedSubscriptionPlans);
  seedManager.registerSeed("paymentMethods", seedPaymentMethods);
  seedManager.registerSeed("coupons", seedCoupons, ["adminUser"]);

  // Ambiente Virtual de Aprendizagem (seed master que registra todos internamente)
  seedManager.registerSeed("ava", seedAva, ["adminUser", "roles"]);

  // Certificados (seed master)
  seedManager.registerSeed("certificates", seedAllCertificates, [
    "ava",
    "adminUser",
  ]);

  // Sistema de vagas (seed master)
  seedManager.registerSeed("jobs", seedJobSystem, [
    "adminUser",
    "subscriptionPlans",
  ]);
}

/**
 * Executa seeds na ordem definida na configuração
 * Esta função é mantida para compatibilidade com o código antigo
 */
export async function runAllSeeds() {
  // Ordem dos grupos conforme configuração
  const groupOrder = [
    CONFIG.seedGroups.core,
    CONFIG.seedGroups.payments,
    CONFIG.seedGroups.ava,
    CONFIG.seedGroups.certificates,
    CONFIG.seedGroups.jobs,
  ];

  let context = {};

  // Executar cada grupo em ordem
  for (const group of groupOrder) {
    for (const seedName of group.seeds) {
      context = await seedManager.executeSeed(seedName);
    }
  }

  return context;
}

// Exportação dos principais seeds de alto nível para uso direto
export { seedCoreSystem } from "./core";
export {
  seedSubscriptionPlans,
  seedPaymentMethods,
  seedCoupons,
} from "./payments";
export { seedAva } from "./ava";
export { seedAllCertificates } from "./certificates";
export { seedJobSystem } from "./jobs";

// Re-exportação de entidades específicas para uso direto quando necessário
export { seedRoles, seedUsers } from "./core";
