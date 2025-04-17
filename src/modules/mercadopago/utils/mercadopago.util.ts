import crypto from "crypto";
import { logger } from "@/shared/utils/logger.utils";

/**
 * Utilitários comuns para a integração com MercadoPago
 */

/**
 * Valida a assinatura do webhook do MercadoPago
 *
 * @param payload Corpo da requisição
 * @param signature Assinatura recebida no header
 * @param secret Segredo compartilhado para validação
 * @returns true se a assinatura for válida
 */
export function validateWebhookSignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  try {
    if (!signature || !secret) {
      logger.warn("Assinatura ou segredo de webhook não fornecidos");
      return false;
    }

    // Prepara o payload
    const stringPayload =
      typeof payload === "string" ? payload : JSON.stringify(payload);

    // Gera HMAC com SHA256
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(stringPayload);
    const calculatedSignature = hmac.digest("hex");

    // Compara assinaturas com timing constante para evitar timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(signature)
    );

    return isValid;
  } catch (error) {
    logger.error("Erro ao validar assinatura de webhook", error);
    return false;
  }
}

/**
 * Prepara os metadados para envio ao MercadoPago
 *
 * @param metadata Metadados a serem preparados
 * @returns Metadados formatados
 */
export function formatRequestMetadata(
  metadata: Record<string, any>
): Record<string, any> {
  try {
    // Filtra valores undefined ou null
    const filtered = Object.entries(metadata)
      .filter(([_, value]) => value !== undefined && value !== null)
      .reduce((obj, [key, value]) => {
        // Converte objetos para string JSON se necessário
        obj[key] = typeof value === "object" ? JSON.stringify(value) : value;
        return obj;
      }, {} as Record<string, any>);

    return filtered;
  } catch (error) {
    logger.warn("Erro ao preparar metadados", error);
    return metadata;
  }
}

/**
 * Decodifica os metadados do pagamento
 *
 * @param metadata Metadados do pagamento
 * @returns Metadados decodificados
 */
export function decodePaymentMetadata(metadata: any): Record<string, any> {
  try {
    if (!metadata) return {};

    if (typeof metadata === "string") {
      try {
        return JSON.parse(metadata);
      } catch (e) {
        return { raw: metadata };
      }
    }

    return metadata;
  } catch (error) {
    logger.warn("Erro ao decodificar metadados de pagamento", error);
    return {};
  }
}

/**
 * Mapeia o status do MercadoPago para o formato do banco de dados
 *
 * @param mpStatus Status do MercadoPago
 * @returns Status mapeado para o formato do banco de dados
 */
export function mapPaymentStatus(mpStatus: string): string {
  switch (mpStatus) {
    case "approved":
      return "APPROVED";
    case "pending":
      return "PENDING";
    case "in_process":
      return "IN_PROCESS";
    case "rejected":
      return "REJECTED";
    case "cancelled":
      return "CANCELLED";
    case "refunded":
      return "REFUNDED";
    case "charged_back":
      return "CHARGED_BACK";
    case "in_mediation":
      return "IN_MEDIATION";
    default:
      return "PENDING";
  }
}

/**
 * Mapeia o status da assinatura do MercadoPago para o formato do banco de dados
 *
 * @param mpStatus Status do MercadoPago
 * @returns Status mapeado para o formato do banco de dados
 */
export function mapSubscriptionStatus(mpStatus: string): string {
  switch (mpStatus) {
    case "authorized":
      return "ACTIVE";
    case "paused":
      return "ON_HOLD";
    case "pending":
      return "PENDING";
    case "cancelled":
      return "CANCELED";
    case "in_process":
      return "PENDING";
    case "rejected":
      return "PAYMENT_FAILED";
    case "expired":
      return "EXPIRED";
    default:
      return "PENDING";
  }
}
