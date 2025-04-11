/**
 * Interfaces para configuração do MercadoPago
 * @module modules/mercadopago/interfaces/config.interface
 */

import { MercadoPagoIntegrationType } from "../enums";

/**
 * Interface para credenciais do MercadoPago
 */
export interface IMercadoPagoCredentials {
  /** Token de acesso à API do MercadoPago */
  accessToken: string;

  /** Chave pública para uso no frontend */
  publicKey: string;

  /** Tipo de integração */
  integrationType: MercadoPagoIntegrationType;

  /** ID da aplicação no MercadoPago (extraído do accessToken) */
  applicationId: string;

  /** Indica se as credenciais são de produção ou teste */
  isProduction?: boolean;
}

/**
 * Interface para o gerenciador de credenciais
 */
export interface ICredentialsManager {
  /**
   * Obtém as credenciais para um tipo específico de integração
   */
  getCredentials(type: MercadoPagoIntegrationType): IMercadoPagoCredentials;

  /**
   * Verifica se as credenciais para um tipo específico estão configuradas
   */
  hasCredentials(type: MercadoPagoIntegrationType): boolean;

  /**
   * Verifica se as credenciais para um tipo específico são de produção
   */
  isProductionCredentials(type: MercadoPagoIntegrationType): boolean;

  /**
   * Atualiza as credenciais para um tipo específico
   */
  updateCredentials(
    type: MercadoPagoIntegrationType,
    credentials: Partial<IMercadoPagoCredentials>
  ): void;

  /**
   * Obtém o segredo para validação de webhook
   */
  getWebhookSecret(type?: MercadoPagoIntegrationType): string;

  /**
   * Verifica se o módulo MercadoPago está habilitado
   */
  isEnabled(): boolean;
}

/**
 * Interface para a configuração do MercadoPago
 */
export interface IMercadoPagoConfig {
  /**
   * Obtém a configuração do SDK para um tipo específico de integração
   */
  getConfig(type: MercadoPagoIntegrationType): any;

  /**
   * Verifica se a configuração está disponível para um tipo específico
   */
  hasConfig(type: MercadoPagoIntegrationType): boolean;

  /**
   * Verifica se o módulo MercadoPago está disponível
   */
  isAvailable(): boolean;

  /**
   * Verifica se estamos em modo de teste
   */
  isTestMode(type?: MercadoPagoIntegrationType): boolean;

  /**
   * Obtém a chave pública para uso no frontend
   */
  getPublicKey(type?: MercadoPagoIntegrationType): string;

  /**
   * Obtém o segredo para validação de webhook
   */
  getWebhookSecret(type?: MercadoPagoIntegrationType): string;
}
