/**
 * Módulo principal de integração com o MercadoPago
 * Fornece as funcionalidades essenciais para interação com a API do MercadoPago
 *
 * @module modules/mercadopago
 */

// Configuração
import { mercadoPagoConfig } from "./config/mercadopago.config";
import { credentialsManager } from "./config/credentials";

// Enumerações
import { MercadoPagoIntegrationType } from "./enums";

// Serviço principal
import { mercadoPagoCoreService } from "./services/core.service";

// Adaptadores
import * as Adapters from "./adapters";

// Utils
import * as Utils from "./utils";

// Tipos
import * as Types from "./types";

// Interfaces
import * as Interfaces from "./interfaces";

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
 * Obtém o adaptador de pagamento do MercadoPago
 * @param type Tipo de integração (opcional, padrão: CHECKOUT)
 * @returns Adaptador de pagamento
 */
export function getPaymentAdapter(
  type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
): Adapters.PaymentAdapter {
  return mercadoPagoCoreService.getPaymentAdapter(type);
}

/**
 * Obtém o adaptador de preferência do MercadoPago
 * @param type Tipo de integração (opcional, padrão: CHECKOUT)
 * @returns Adaptador de preferência
 */
export function getPreferenceAdapter(
  type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
): Adapters.PreferenceAdapter {
  return mercadoPagoCoreService.getPreferenceAdapter(type);
}

/**
 * Obtém o adaptador de assinatura do MercadoPago
 * @returns Adaptador de assinatura
 */
export function getSubscriptionAdapter(): Adapters.SubscriptionAdapter {
  return mercadoPagoCoreService.getSubscriptionAdapter();
}

/**
 * Obtém o adaptador de ordem de mercador do MercadoPago
 * @param type Tipo de integração (opcional, padrão: CHECKOUT)
 * @returns Adaptador de ordem de mercador
 */
export function getMerchantOrderAdapter(
  type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
): Adapters.MerchantOrderAdapter {
  return mercadoPagoCoreService.getMerchantOrderAdapter(type);
}

// Exporta os membros principais do módulo
export {
  // Configuração
  mercadoPagoConfig,
  credentialsManager,

  // Enumerações
  MercadoPagoIntegrationType,

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
