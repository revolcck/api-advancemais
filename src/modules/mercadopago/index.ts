/**
 * Módulo de integração com o MercadoPago
 * @module modules/mercadopago
 */

// Configuração
export { mercadoPagoConfig } from "./config/mercadopago.config";
export {
  MercadoPagoIntegrationType,
  credentialsManager,
} from "./config/credentials";

// Serviços
export { paymentService } from "./services/payment.service";
export { subscriptionService } from "./services/subscription.service";
export { preferenceService } from "./services/preference.service";
export {
  checkoutWebhookService,
  subscriptionWebhookService,
  WebhookTopicType,
} from "./services/webhook.service";

// Interfaces
export * from "./interfaces/payment.interface";
export * from "./interfaces/subscription.interface";
export * from "./interfaces/preference.interface";

// Rotas
import mercadoPagoRoutes from "./routes";
export { mercadoPagoRoutes };
