/**
 * Tipos relacionados a eventos e webhooks do MercadoPago
 * @module modules/mercadopago/types/events.types
 */

import { MercadoPagoIntegrationType } from "../enums";

/**
 * Tipos de evento suportados pelo MercadoPago
 */
export enum WebhookEventType {
  PAYMENT = "payment",
  PLAN = "plan",
  SUBSCRIPTION = "subscription",
  INVOICE = "invoice",
  POINT_INTEGRATION = "point_integration_wh",
  MERCHANT_ORDER = "merchant_order",
}

/**
 * Configuração para processadores de webhook
 */
export interface WebhookConfig {
  /** Tipo de integração associada ao webhook */
  integrationType: MercadoPagoIntegrationType;

  /** Segredo para validação do webhook */
  webhookSecret: string;

  /** URL base para a API do MercadoPago */
  apiBaseUrl?: string;
}

/**
 * Tipos de status que podem ser recebidos em webhooks de pagamento
 */
export enum PaymentWebhookStatus {
  PENDING = "pending",
  APPROVED = "approved",
  AUTHORIZED = "authorized",
  IN_PROCESS = "in_process",
  IN_MEDIATION = "in_mediation",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
  CHARGED_BACK = "charged_back",
}

/**
 * Tipos de status que podem ser recebidos em webhooks de assinatura
 */
export enum SubscriptionWebhookStatus {
  PENDING = "pending",
  AUTHORIZED = "authorized",
  PAUSED = "paused",
  CANCELLED = "cancelled",
  ENDED = "ended",
}

/**
 * Dados comuns para todos os eventos de webhook
 */
export interface BaseWebhookEvent {
  /** Tipo do evento */
  type: string;

  /** Data de criação do evento */
  date_created: string | number;

  /** ID do recurso */
  id?: string;

  /** ID da aplicação */
  application_id?: string;

  /** ID do usuário */
  user_id?: string;

  /** Flag de modo ao vivo (vs. sandbox) */
  live_mode?: boolean;

  /** Versão da API */
  api_version?: string;

  /** Dados adicionais do webhook */
  data?: {
    /** ID do recurso */
    id: string;

    [key: string]: any;
  };
}

/**
 * Evento de webhook para pagamentos
 */
export interface PaymentWebhookEvent extends BaseWebhookEvent {
  type: WebhookEventType.PAYMENT;

  /** Ação específica do evento */
  action?: string;

  data: {
    id: string;
    status?: PaymentWebhookStatus;
    [key: string]: any;
  };
}

/**
 * Evento de webhook para assinaturas
 */
export interface SubscriptionWebhookEvent extends BaseWebhookEvent {
  type: WebhookEventType.SUBSCRIPTION;

  /** Ação específica do evento */
  action?: string;

  data: {
    id: string;
    status?: SubscriptionWebhookStatus;
    [key: string]: any;
  };
}

/**
 * Evento de webhook para merchant orders
 */
export interface MerchantOrderWebhookEvent extends BaseWebhookEvent {
  type: WebhookEventType.MERCHANT_ORDER;

  data: {
    id: string;
    [key: string]: any;
  };
}

/**
 * União de todos os tipos possíveis de eventos de webhook
 */
export type WebhookEvent =
  | PaymentWebhookEvent
  | SubscriptionWebhookEvent
  | MerchantOrderWebhookEvent
  | BaseWebhookEvent;
