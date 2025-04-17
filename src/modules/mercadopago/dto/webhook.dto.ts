/**
 * DTOs para dados de webhook
 */

/**
 * DTO para dados da notificação webhook
 */
export interface WebhookNotificationDto {
  id: string;
  action: string; // "payment.created", "payment.updated", etc.
  api_version: string;
  date_created: string;
  type: string;
  data: {
    id: string;
  };
  user_id?: string;
  live_mode: boolean;
}

/**
 * DTO para resposta de processamento de webhook
 */
export interface WebhookProcessResponseDto {
  success: boolean;
  message: string;
}

/**
 * DTO para teste de webhook
 */
export interface WebhookTestResponseDto {
  message: string;
  environment: string;
  webhookUrl: string;
}
