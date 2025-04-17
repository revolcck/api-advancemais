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
export { subscriptionService } from "./subscriber/services/subscription.service";
export { coursePaymentService } from "./courses/services/course-payment.service";
export { webhookService } from "./webhooks/services/webhook.service";

// Types
export * from "./dto/payment.dto";
export * from "./dto/subscription.dto";
export * from "./dto/webhook.dto";

// Rotas
import router from "./routes/index";
export default router;
