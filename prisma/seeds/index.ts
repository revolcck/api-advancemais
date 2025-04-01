import { SeedContext } from "./utils";
import { seedRoles } from "./roles";
import { seedUsers } from "./users";
import { seedSubscriptionPlans } from "./subscriptionPlans";
import { seedPaymentMethods } from "./paymentMethods";
import { seedCoupons } from "./coupons";
import { seedAva } from "./ava";

/**
 * Executa todos os seeds na ordem correta
 */
export async function runAllSeeds(): Promise<SeedContext> {
  console.log("Iniciando execução de todos os seeds...");

  // Objeto de contexto inicial vazio
  let context: SeedContext = {};

  // Executa os seeds mantendo o contexto atualizado
  context = await seedRoles(context);
  context = await seedUsers(context);
  context = await seedSubscriptionPlans(context);
  context = await seedPaymentMethods(context);
  context = await seedCoupons(context);

  // Seeds do AVA
  context = await seedAva(context);

  console.log("Todos os seeds foram executados com sucesso!");

  return context;
}
