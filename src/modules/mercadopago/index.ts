/**
 * Módulo core de integração com o MercadoPago
 * Fornece as funcionalidades essenciais para interação com a API do MercadoPago
 *
 * @module modules/mercadopago
 */

// Configuração
import { mercadoPagoConfig } from "./config/mercadopago.config";
import {
  MercadoPagoIntegrationType,
  credentialsManager,
} from "./config/credentials";

// Serviço principal
import { mercadoPagoCoreService } from "./services/core.service";

// Adaptadores
import * as Adapters from "./adapters";

// Tipos e interfaces
import * as Interfaces from "./interfaces";
import * as Types from "./types/common.types";
import * as PaymentTypes from "./types/payment.types";
import * as SubscriptionTypes from "./types/subscription.types";

// Utilitários
import * as ErrorHandler from "./utils/error-handler.util";

// Exportações explícitas para todo o módulo
export {
  // Configuração
  mercadoPagoConfig,
  MercadoPagoIntegrationType,
  credentialsManager,

  // Serviço principal
  mercadoPagoCoreService,

  // Adaptadores
  Adapters,

  // Tipos e interfaces
  Interfaces,
  Types,
  PaymentTypes,
  SubscriptionTypes,

  // Utilitários
  ErrorHandler,
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

/**
 * Testa a conectividade com a API do MercadoPago
 * @returns Resultado do teste de conectividade
 */
export async function testMercadoPagoConnectivity(): Promise<Interfaces.ConnectivityInfo> {
  return await mercadoPagoCoreService.testConnectivity();
}
