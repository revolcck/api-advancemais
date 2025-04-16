/**
 * Módulo principal de integração com o MercadoPago
 * Fornece acesso centralizado aos serviços e componentes do MercadoPago
 *
 * @module modules/mercadopago
 */

// Configuração
import { mercadoPagoConfig } from "./config/mercadopago.config";
import { credentialsManager } from "./config/credentials";

// Enumerações
import { MercadoPagoIntegrationType } from "./enums";

// Fábricas
import { mercadoPagoServiceFactory } from "./factories/service.factory";
import { PaymentFactory } from "./factories/payment.factory";

// Interfaces e Tipos
import * as Interfaces from "./interfaces";
import * as Types from "./types";

// Serviço principal (apenas o core)
import { mercadoPagoCoreService } from "./services/core.service";

// Adaptadores
import * as Adapters from "./adapters";

// Utils
import * as Utils from "./utils";

// Validators
import * as Validators from "./validators/webhook.validators";

/**
 * Verifica se a integração com o MercadoPago está disponível
 * @returns Verdadeiro se o serviço estiver disponível
 */
export function isMercadoPagoAvailable(): boolean {
  return mercadoPagoConfig.isAvailable();
}

/**
 * Verifica se estamos em modo de teste
 * @param type Tipo de integração (opcional)
 * @returns Verdadeiro se estamos usando credenciais de teste
 */
export function isMercadoPagoTestMode(
  type?: MercadoPagoIntegrationType
): boolean {
  return mercadoPagoConfig.isTestMode(type);
}

/**
 * Obtém a chave pública para uso no frontend
 * @param type Tipo de integração (opcional)
 * @returns Chave pública do MercadoPago
 */
export function getMercadoPagoPublicKey(
  type?: MercadoPagoIntegrationType
): string {
  return mercadoPagoConfig.getPublicKey(type);
}

/**
 * Testa a conectividade com a API do MercadoPago
 * @param type Tipo de integração a testar (opcional)
 * @returns Resultado do teste de conectividade
 */
export async function testMercadoPagoConnectivity(
  type?: MercadoPagoIntegrationType
): Promise<Interfaces.IConnectivityInfo> {
  return mercadoPagoCoreService.testConnectivity(type);
}

/**
 * Obtém o serviço de pagamento do MercadoPago
 * @param type Tipo de integração (opcional, padrão: CHECKOUT)
 * @returns Serviço de pagamento
 */
export function getPaymentService(
  type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
): Interfaces.IPaymentService {
  return mercadoPagoServiceFactory.getPaymentService(type);
}

/**
 * Obtém o serviço de assinatura do MercadoPago
 * @returns Serviço de assinatura
 */
export function getSubscriptionService(): Interfaces.ISubscriptionService {
  return mercadoPagoServiceFactory.getSubscriptionService();
}

/**
 * Obtém o processador de webhook do MercadoPago
 * @returns Processador de webhook
 */
export function getWebhookProcessor(): Interfaces.IWebhookProcessorService {
  return mercadoPagoServiceFactory.getWebhookProcessor();
}

/**
 * Limpa o cache de serviços
 * Útil quando há mudança de credenciais ou ambiente
 */
export function clearServiceCache(): void {
  mercadoPagoServiceFactory.clearCache();
  mercadoPagoCoreService.clearAdapterCache();
}

/**
 * Obtém o adaptador de pagamento do MercadoPago (acesso de baixo nível)
 * @param type Tipo de integração (opcional, padrão: CHECKOUT)
 * @returns Adaptador de pagamento
 */
export function getPaymentAdapter(
  type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
): Adapters.PaymentAdapter {
  return mercadoPagoCoreService.getPaymentAdapter(type);
}

/**
 * Obtém o adaptador de preferência do MercadoPago (acesso de baixo nível)
 * @param type Tipo de integração (opcional, padrão: CHECKOUT)
 * @returns Adaptador de preferência
 */
export function getPreferenceAdapter(
  type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
): Adapters.PreferenceAdapter {
  return mercadoPagoCoreService.getPreferenceAdapter(type);
}

/**
 * Obtém o adaptador de ordem de mercador do MercadoPago (acesso de baixo nível)
 * @param type Tipo de integração (opcional, padrão: CHECKOUT)
 * @returns Adaptador de ordem de mercador
 */
export function getMerchantOrderAdapter(
  type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
): Adapters.MerchantOrderAdapter {
  return mercadoPagoCoreService.getMerchantOrderAdapter(type);
}

/**
 * Verifica se um webhook é de teste
 * @param payload Payload do webhook
 * @returns Verdadeiro se o webhook for de teste
 */
export function isTestWebhook(payload: any): boolean {
  return Utils.WebhookValidator.isTestWebhook(payload);
}

// Exporta os membros principais do módulo
export {
  // Configuração
  mercadoPagoConfig,
  credentialsManager,

  // Enumerações
  MercadoPagoIntegrationType,

  // Fábricas
  mercadoPagoServiceFactory,
  PaymentFactory,

  // Serviço principal
  mercadoPagoCoreService,

  // Adaptadores
  Adapters,

  // Utils
  Utils,

  // Tipos
  Types,

  // Interfaces
  Interfaces,

  // Validators
  Validators,
};
