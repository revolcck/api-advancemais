import { seedManager } from "./utils";
import CONFIG from "./config";
import { registerCoreSeeds } from "./core";
import { registerPaymentSeeds } from "./payments";
import { registerAvaSeeds } from "./ava";
import { registerCertificateSeeds } from "./certificates";
import { registerJobSeeds } from "./jobs";

/**
 * Registra todos os seeds disponíveis no sistema
 */
export function registerAllSeeds(): void {
  // Registrar seeds organizados por domínio
  registerCoreSeeds();
  registerPaymentSeeds();
  registerAvaSeeds();
  registerCertificateSeeds();
  registerJobSeeds();
}

/**
 * Executa todos os seeds na ordem definida pela configuração
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

// Exportar as seeds para uso direto
export * from "./core";
export * from "./payments";
export * from "./ava";
export * from "./certificates";
export * from "./jobs";
