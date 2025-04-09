/**
 * Interfaces para webhooks de assinatura
 * @module modules/subscription/interfaces/webhook.interface
 */

import { WebhookEventType } from "@/modules/mercadopago/types/events.types";

/**
 * Interface para processador de webhook de assinatura
 */
export interface ISubscriptionWebhookProcessor {
  /**
   * Processa evento de webhook de assinatura
   * @param eventType Tipo de evento
   * @param data Dados do evento
   * @param id ID do evento
   */
  processEvent(
    eventType: WebhookEventType,
    data: Record<string, any>,
    id?: string
  ): Promise<IWebhookProcessResult>;
}

/**
 * Interface para resultado do processamento de webhook
 */
export interface IWebhookProcessResult {
  success: boolean;
  message: string;
  data?: any;
  action?: string;
  error?: string;
  errorCode?: string;
  subscriptionId?: string;
  paymentId?: string;
  status?: string;
}

/**
 * Interface para serviço de webhooks de assinatura
 */
export interface ISubscriptionWebhookService {
  /**
   * Processa eventos de assinatura
   */
  processSubscriptionEvent(
    id: string,
    action: string,
    data: Record<string, any>
  ): Promise<IWebhookProcessResult>;

  /**
   * Processa eventos de pagamento
   */
  processPaymentEvent(
    id: string,
    action: string,
    data: Record<string, any>
  ): Promise<IWebhookProcessResult>;

  /**
   * Processa eventos de plano
   */
  processPlanEvent(
    id: string,
    action: string,
    data: Record<string, any>
  ): Promise<IWebhookProcessResult>;

  /**
   * Processa eventos de ordem (merchant order)
   */
  processMerchantOrderEvent(
    id: string,
    action: string,
    data: Record<string, any>
  ): Promise<IWebhookProcessResult>;
}
