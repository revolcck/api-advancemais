import { redisService } from "@/config/redis";
import { logger } from "@/shared/utils/logger.utils";

/**
 * Helpers para processamento de webhooks
 */

/**
 * Adquire um lock para processamento exclusivo de um webhook
 * Evita processamento duplicado do mesmo evento
 *
 * @param eventId ID do evento a ser processado
 * @param ttlSeconds Tempo de vida do lock em segundos
 * @returns true se o lock foi adquirido com sucesso
 */
export async function acquireWebhookLock(
  eventId: string,
  ttlSeconds = 300
): Promise<boolean> {
  try {
    const lockKey = `webhook:lock:${eventId}`;
    const result = await redisService.set(lockKey, "1", ttlSeconds, "NX");

    return result === "OK";
  } catch (error) {
    logger.error(`Erro ao adquirir lock para webhook ${eventId}`, error);
    // Se o Redis falhar, permitimos o processamento para evitar perder eventos
    return true;
  }
}

/**
 * Libera o lock de processamento de um webhook
 *
 * @param eventId ID do evento processado
 */
export async function releaseWebhookLock(eventId: string): Promise<void> {
  try {
    const lockKey = `webhook:lock:${eventId}`;
    await redisService.delete(lockKey);
  } catch (error) {
    logger.error(`Erro ao liberar lock para webhook ${eventId}`, error);
    // Erro não crítico, o lock irá expirar automaticamente
  }
}

/**
 * Extrai a informação relevante do ID do recurso da notificação
 *
 * @param resourceId ID do recurso no formato "/resources/{resourceType}/{id}"
 * @returns ID limpo do recurso
 */
export function extractResourceId(resourceId: string): string {
  try {
    if (!resourceId) return "";

    // Para IDs no formato "/v1/payments/123456789"
    if (resourceId.includes("/")) {
      const parts = resourceId.split("/");
      return parts[parts.length - 1];
    }

    return resourceId;
  } catch (error) {
    logger.error(`Erro ao extrair ID do recurso: ${resourceId}`, error);
    return resourceId;
  }
}

/**
 * Determina o tipo de ação com base no tópico e tipo de notificação
 *
 * @param topic Tópico da notificação (payment, subscription, etc)
 * @param type Tipo da notificação (created, updated, etc)
 * @returns Ação formatada (payment.created, subscription.updated, etc)
 */
export function determineAction(topic: string, type: string): string {
  if (!topic && !type) return "unknown";

  if (topic && type) {
    return `${topic}.${type}`;
  }

  return topic || type;
}
