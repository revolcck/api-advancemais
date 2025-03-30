/**
 * Módulo de integração com o MercadoPago
 * Fornece serviços para processamento de pagamentos, assinaturas e webhooks
 *
 * @module modules/mercadopago
 */

// Configuração
import { mercadoPagoConfig } from "./config/mercadopago.config";
import {
  MercadoPagoIntegrationType,
  credentialsManager,
} from "./config/credentials";

// Serviços
import { paymentService } from "./services/payment.service";
import { subscriptionService } from "./services/subscription.service";
import { preferenceService } from "./services/preference.service";
import { mercadoPagoNotificationService } from "./services/notification.service";
import {
  templateService,
  EmailTemplateType,
} from "./services/template.service";
import {
  checkoutWebhookService,
  subscriptionWebhookService,
  WebhookTopicType,
} from "./services/webhook.service";

// Controladores
import { paymentController } from "./controllers/payment.controller";
import { subscriptionController } from "./controllers/subscription.controller";
import { preferenceController } from "./controllers/preference.controller";
import { webhookController } from "./controllers/webhook.controller";

// Rotas
import mercadoPagoRoutes from "./routes";

// DTOs e interfaces
import * as DTOs from "./dtos/mercadopago.dto";
import * as Interfaces from "./interfaces";

// Exportações explícitas para todo o módulo
export {
  // Configuração
  mercadoPagoConfig,
  MercadoPagoIntegrationType,
  credentialsManager,

  // Serviços
  paymentService,
  subscriptionService,
  preferenceService,
  mercadoPagoNotificationService,
  templateService,
  EmailTemplateType,
  checkoutWebhookService,
  subscriptionWebhookService,
  WebhookTopicType,

  // Controladores
  paymentController,
  subscriptionController,
  preferenceController,
  webhookController,

  // Rotas
  mercadoPagoRoutes,

  // DTOs e interfaces
  DTOs,
  Interfaces,
};

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
