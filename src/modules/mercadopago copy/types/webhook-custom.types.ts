/**
 * Tipos de notificação do MercadoPago
 */
export enum WebhookTopicType {
  PAYMENT = "payment",
  MERCHANT_ORDER = "merchant_order",
  PLAN = "plan",
  SUBSCRIPTION = "subscription",
  INVOICE = "invoice",
  POINT_INTEGRATION_WIRED = "point_integration_wired",
}

/**
 * Dados da notificação de webhook
 */
export interface WebhookNotificationData {
  id: string;
  [key: string]: any;
}

/**
 * Notificação de webhook do MercadoPago
 */
export interface WebhookNotification {
  type: string;
  date_created: string | number;
  id?: string;
  data?: WebhookNotificationData;
  user_id?: number | string;
  api_version?: string;
  action?: string;
  live_mode?: boolean;
  [key: string]: any;
}

/**
 * Resposta para processamento de webhook
 */
export interface WebhookProcessResponse {
  success: boolean;
  type?: string;
  resourceId?: string;
  message?: string;
  data?: any;
  error?: string;
  errorCode?: string;
}

/**
 * Resultado de obtenção de ordem de mercador
 */
export interface MerchantOrderResponse {
  id: string | number;
  status: string;
  external_reference?: string;
  preference_id?: string;
  payments?: any[];
  shipments?: any[];
  items?: any[];
  date_created: string | number;
  last_updated: string | number;
  [key: string]: any;
}
