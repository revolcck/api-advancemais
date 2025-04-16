/**
 * DTOs para webhooks de assinatura
 * @module modules/subscription/dto/webhook.dto
 */

import { WebhookEventType } from "@/modules/mercadopago/types/events.types";

/**
 * DTO para processamento de webhook do MercadoPago
 */
export class ProcessWebhookDTO {
  type: WebhookEventType;
  action?: string;
  id: string;
  date_created: string | Date;
  data: {
    id: string;
    [key: string]: any;
  };
  live_mode?: boolean;
}

/**
 * DTO para resposta de processamento de webhook
 */
export class WebhookResponseDTO {
  success: boolean;
  message: string;
  eventType: string;
  resourceId?: string;
  resourceType?: string;
  action?: string;
  status?: string;
  error?: string;
  errorCode?: string;
}

/**
 * DTO para verificação de webhook
 */
export class VerifyWebhookDTO {
  signature: string;
  payload: string;
  type?: string;
}

/**
 * DTO para evento de assinatura
 */
export class SubscriptionEventDTO {
  id: string;
  action: string;
  status?: string;
  external_reference?: string;
  payer_email?: string;
  reason?: string;
  preapproval_plan_id?: string;
  payment_method_id?: string;
  last_modified?: string | Date;
  next_payment_date?: string | Date;
  [key: string]: any;
}

/**
 * DTO para evento de pagamento
 */
export class PaymentEventDTO {
  id: string;
  action: string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  date_created?: string | Date;
  date_approved?: string | Date;
  transaction_amount?: number;
  payment_method_id?: string;
  payment_type_id?: string;
  [key: string]: any;
}
