/**
 * Tipos relacionados a webhooks de assinatura
 * @module modules/subscription/types/webhook.types
 */

import { WebhookEventType } from "@/modules/mercadopago/types/events.types";
import { MercadoPagoIntegrationType } from "@/modules/mercadopago/enums";

/**
 * Notificação de webhook recebida
 */
export type WebhookNotification = {
  id: string;
  type: string;
  action?: string;
  date_created: string | Date;
  data: {
    id: string;
    [key: string]: any;
  };
  api_version?: string;
  live_mode?: boolean;
  integrationType?: MercadoPagoIntegrationType;
};

/**
 * Status de processamento de webhook
 */
export type WebhookProcessingStatus =
  | "pending"
  | "processing"
  | "success"
  | "failed";

/**
 * Resultado do processamento de webhook
 */
export type WebhookProcessResult = {
  success: boolean;
  message: string;
  action?: string;
  resourceId?: string;
  resourceType?: string;
  status?: string;
  error?: string;
  errorCode?: string;
  data?: any;
};

/**
 * Mapeamento entre evento e tipo de recurso
 */
export type EventResourceMapping = {
  [key in WebhookEventType]?: {
    resourceType: string;
    handler: string;
  };
};

/**
 * Configuração de webhook
 */
export type WebhookConfig = {
  enabled: boolean;
  secret: string;
  url: string;
  apiBaseUrl: string;
  integrationType: MercadoPagoIntegrationType;
};

/**
 * Informações de assinatura de webhook
 */
export type WebhookSignatureInfo = {
  signature: string;
  timestamp: string;
  method: string;
  url: string;
  body: string;
  isValid: boolean;
};

/**
 * Resumo de estatísticas de webhook
 */
export type WebhookStats = {
  total: number;
  success: number;
  failed: number;
  pending: number;
  byEventType: {
    [key: string]: number;
  };
  byDate: {
    date: string;
    count: number;
    success: number;
    failed: number;
  }[];
};
