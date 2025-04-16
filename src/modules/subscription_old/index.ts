/**
 * Módulo de assinaturas para integração com MercadoPago
 * Gerencia planos, assinaturas, pagamentos recorrentes e webhooks
 *
 * @module modules/subscription
 */

// Exportar rotas para uso no app principal
import routes from "./routes";

// Importações de configuração
import { subscriptionConfig } from "./config/subscription.config";

// Importações de serviços
import { planService } from "./services/plan.service";
import { subscriptionService } from "./services/subscription.service";
import { webhookService } from "./services/webhook.service";

// Importações de DTOs
import * as DTO from "./dto";

// Importações de interfaces
import * as Interfaces from "./interfaces";

// Importações de tipos
import * as Types from "./types";

// Re-exportar para uso externo
export {
  routes,
  subscriptionConfig,
  planService,
  subscriptionService,
  webhookService,
  DTO,
  Interfaces,
  Types,
};

// Função utilitária para verificar se o módulo está habilitado
export function isSubscriptionModuleEnabled(): boolean {
  return subscriptionConfig.isEnabled();
}

// Função utilitária para verificar se a integração com MercadoPago está habilitada
export function isMercadoPagoIntegrationEnabled(): boolean {
  return subscriptionConfig.isMercadoPagoEnabled();
}

// Exportação padrão das rotas
export default routes;
