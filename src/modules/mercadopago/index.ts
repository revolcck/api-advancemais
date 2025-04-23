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
export { coursePaymentService } from "./courses/services/course-payment.service";
export { webhookService } from "./webhooks/services/webhook.service";

// Subscription Module (novo sistema)
export { subscriptionService, planService } from "./subscription";

// Types
export * from "./dto/payment.dto";
export * from "./dto/webhook.dto";

// Novos DTOs do sistema de assinaturas
export * from "./subscription/dto/plan.dto";
export * from "./subscription/dto/subscription.dto";

// Rotas
import routes from "./routes/index";
export default routes;
