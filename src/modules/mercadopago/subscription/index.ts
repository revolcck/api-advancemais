/**
 * Módulo de assinaturas e planos via MercadoPago
 *
 * Este módulo gerencia o ciclo de vida completo das assinaturas e planos,
 * desde a criação até o processamento de pagamentos recorrentes.
 */

// Serviços
export { subscriptionService } from "./services/subscription.service";
export { planService } from "./services/plan.service";

// DTOs
export * from "./dto/subscription.dto";
export * from "./dto/plan.dto";

// Controladores
export { SubscriptionController } from "./controllers/subscription.controller";
export { PlanController } from "./controllers/plan.controller";

// Rotas
import subscriptionRoutes from "./routes";
export default subscriptionRoutes;
