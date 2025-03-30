/**
 * Módulo de integração com o MercadoPago
 * Fornece serviços para processamento de pagamentos, assinaturas e webhooks
 *
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
export { mercadoPagoNotificationService } from "./services/notification.service";
export {
  templateService,
  EmailTemplateType,
} from "./services/template.service";
export {
  checkoutWebhookService,
  subscriptionWebhookService,
  WebhookTopicType,
} from "./services/webhook.service";

// Controladores
export { paymentController } from "./controllers/payment.controller";
export { subscriptionController } from "./controllers/subscription.controller";
export { preferenceController } from "./controllers/preference.controller";
export { webhookController } from "./controllers/webhook.controller";

// DTOs e interfaces
export * from "./dtos/mercadopago.dto";
export * from "./interfaces";

// Rotas
import mercadoPagoRoutes from "./routes";
export { mercadoPagoRoutes };

/**
 * Verifica se a integração com o MercadoPago está disponível
 * @returns Verdadeiro se o serviço estiver disponível
 */
export function isMercadoPagoAvailable(): boolean {
  return mercadoPagoConfig.isAvailable();
}

/**
 * Verifica se estamos em modo de teste
 * @returns Verdadeiro se estamos usando credenciais de teste
 */
export function isMercadoPagoTestMode(): boolean {
  return mercadoPagoConfig.isTestMode();
}

/**
 * Obtém a chave pública para uso no frontend
 * @returns Chave pública do MercadoPago
 */
export function getMercadoPagoPublicKey(): string {
  return mercadoPagoConfig.getPublicKey();
}
