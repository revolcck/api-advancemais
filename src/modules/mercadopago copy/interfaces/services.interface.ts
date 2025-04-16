/**
 * Interfaces para serviços do módulo MercadoPago
 * Define contratos claros para implementação de serviços específicos
 * @module modules/mercadopago/interfaces/services.interface
 */

import { MercadoPagoIntegrationType } from "../enums";
import {
  PaymentCreateData,
  PaymentResponse,
  PreferenceData,
  PreferenceResponse,
} from "../types/payment.types";
import {
  SubscriptionCreateData,
  SubscriptionResponse,
  SubscriptionUpdateData,
} from "../types/subscription.types";
import {
  WebhookNotification,
  WebhookProcessResponse,
} from "../types/common.types";

/**
 * Interface para serviço de pagamento
 * Define métodos para criação e gerenciamento de pagamentos
 */
export interface IPaymentService {
  /**
   * Cria um novo pagamento
   * @param data Dados para criação do pagamento
   * @param options Opções adicionais
   */
  createPayment(
    data: PaymentCreateData,
    options?: Record<string, any>
  ): Promise<PaymentResponse>;

  /**
   * Obtém detalhes de um pagamento por ID
   * @param id ID do pagamento
   */
  getPayment(id: string | number): Promise<PaymentResponse>;

  /**
   * Reembolsa um pagamento (total ou parcial)
   * @param id ID do pagamento
   * @param amount Valor a ser reembolsado (opcional para reembolso total)
   */
  refundPayment(id: string | number, amount?: number): Promise<any>;

  /**
   * Cria uma preferência de pagamento para Checkout Pro
   * @param data Dados para criação da preferência
   * @param options Opções adicionais
   */
  createPreference(
    data: PreferenceData,
    options?: Record<string, any>
  ): Promise<PreferenceResponse>;

  /**
   * Obtém detalhes de uma preferência por ID
   * @param id ID da preferência
   */
  getPreference(id: string): Promise<PreferenceResponse>;

  /**
   * Atualiza uma preferência existente
   * @param id ID da preferência
   * @param data Dados para atualização
   */
  updatePreference(
    id: string,
    data: Partial<PreferenceData>
  ): Promise<PreferenceResponse>;
}

/**
 * Interface para serviço de assinatura
 * Define métodos para criação e gerenciamento de assinaturas
 */
export interface ISubscriptionService {
  /**
   * Cria uma nova assinatura
   * @param data Dados para criação da assinatura
   * @param options Opções adicionais
   */
  createSubscription(
    data: SubscriptionCreateData,
    options?: Record<string, any>
  ): Promise<SubscriptionResponse>;

  /**
   * Obtém detalhes de uma assinatura por ID
   * @param id ID da assinatura
   */
  getSubscription(id: string): Promise<SubscriptionResponse>;

  /**
   * Atualiza uma assinatura existente
   * @param id ID da assinatura
   * @param data Dados para atualização
   */
  updateSubscription(
    id: string,
    data: SubscriptionUpdateData
  ): Promise<SubscriptionResponse>;

  /**
   * Cancela uma assinatura
   * @param id ID da assinatura
   */
  cancelSubscription(id: string): Promise<SubscriptionResponse>;

  /**
   * Pausa uma assinatura
   * @param id ID da assinatura
   */
  pauseSubscription(id: string): Promise<SubscriptionResponse>;

  /**
   * Retoma uma assinatura pausada
   * @param id ID da assinatura
   */
  resumeSubscription(id: string): Promise<SubscriptionResponse>;
}

/**
 * Interface para processador de webhook
 * Define métodos para processamento de notificações do MercadoPago
 */
export interface IWebhookProcessorService {
  /**
   * Processa uma notificação de webhook
   * @param notification Dados da notificação
   */
  processWebhook(
    notification: WebhookNotification
  ): Promise<WebhookProcessResponse>;

  /**
   * Processa uma notificação de pagamento
   * @param notification Dados da notificação
   */
  processPaymentWebhook(
    notification: WebhookNotification
  ): Promise<WebhookProcessResponse>;

  /**
   * Processa uma notificação de assinatura
   * @param notification Dados da notificação
   */
  processSubscriptionWebhook(
    notification: WebhookNotification
  ): Promise<WebhookProcessResponse>;
}

/**
 * Interface para fábrica de serviços MercadoPago
 * Permite obter instâncias de serviços específicos
 */
export interface IMercadoPagoServiceFactory {
  /**
   * Obtém serviço de pagamento para o tipo especificado
   * @param type Tipo de integração (default: CHECKOUT)
   */
  getPaymentService(type?: MercadoPagoIntegrationType): IPaymentService;

  /**
   * Obtém serviço de assinatura
   */
  getSubscriptionService(): ISubscriptionService;

  /**
   * Obtém processador de webhook
   */
  getWebhookProcessor(): IWebhookProcessorService;
}
