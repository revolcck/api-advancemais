/**
 * Módulo de integração com MercadoPago
 *
 * Este arquivo exporta os componentes principais do módulo para uso em
 * outras partes do sistema.
 */

// Core
export { mercadoPagoConfig } from "./core/config/mercadopago.config";
export { paymentService } from "./core/services/payment.service";

// Services
export { subscriptionService as legacySubscriptionService } from "./subscription/services/subscription.service";
export { coursePaymentService } from "./courses/services/course-payment.service";
export { webhookService } from "./webhooks/services/webhook.service";

// Subscription Module (novo)
export { subscriptionService, planService } from "./subscription";

// Types
export * from "./dto/payment.dto";
export * from "./dto/webhook.dto";

// Apenas exporte os DTOs necessários do módulo legado para evitar colisões
// export * from "./dto/subscription.dto";

// Novos DTOs de assinatura (com prioridade)
export * from "./subscription/dto/plan.dto";
export * from "./subscription/dto/subscription.dto";

// Importações para o router
import * as router from "./routes/index";
export default router;
