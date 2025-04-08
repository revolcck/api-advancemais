/**
 * Utilitário para validação de webhooks do MercadoPago
 * @module modules/mercadopago/utils/webhook-validator.util
 */

import crypto from "crypto";
import { logger } from "@/shared/utils/logger.utils";
import { mercadoPagoConfig } from "../config/mercadopago.config";
import { MercadoPagoIntegrationType } from "../enums";
import { WebhookEventType } from "../types/events.types";

/**
 * Utilitário para validação de webhooks do MercadoPago
 */
export class WebhookValidator {
  /**
   * Verifica a assinatura de um webhook do MercadoPago
   *
   * @param payload Payload do webhook em formato string
   * @param signature Assinatura recebida no cabeçalho x-signature
   * @param type Tipo de integração (para usar o segredo específico)
   * @returns true se a assinatura for válida, false caso contrário
   */
  public static verifySignature(
    payload: string,
    signature: string,
    type?: MercadoPagoIntegrationType
  ): boolean {
    try {
      // Se não há assinatura, não podemos validar
      if (!signature) {
        logger.warn("Webhook recebido sem assinatura no cabeçalho");
        return false;
      }

      // Obtém o segredo apropriado com base no tipo de integração
      const secret = mercadoPagoConfig.getWebhookSecret(type);

      // Se não há segredo configurado, log de aviso
      if (!secret) {
        logger.warn(
          `Webhook recebido, mas secret não está configurado para validação (tipo: ${
            type || "default"
          })`
        );
        // Em ambiente de desenvolvimento, permitir sem validação
        if (process.env.NODE_ENV === "development") {
          return true;
        }
        return false;
      }

      // Calcula o HMAC SHA256 do payload usando o secret
      const calculatedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      // Compara a assinatura calculada com a recebida
      const isValid = calculatedSignature === signature;

      if (!isValid) {
        logger.warn("Assinatura de webhook inválida", {
          expected: calculatedSignature,
          received: signature,
          integrationType: type || "default",
        });
      } else {
        logger.debug("Assinatura de webhook validada com sucesso", {
          integrationType: type || "default",
        });
      }

      return isValid;
    } catch (error) {
      logger.error("Erro ao validar assinatura de webhook", error);
      return false;
    }
  }

  /**
   * Normaliza o tipo de notificação para um tipo padrão interno
   * @param type Tipo de notificação recebido no webhook
   * @returns Tipo normalizado
   */
  public static normalizeEventType(type: string): WebhookEventType {
    // Mapeamento de tipos de notificação do MercadoPago para nossos tipos internos
    const typeMap: Record<string, WebhookEventType> = {
      payment: WebhookEventType.PAYMENT,
      plan: WebhookEventType.PLAN,
      subscription: WebhookEventType.SUBSCRIPTION,
      invoice: WebhookEventType.INVOICE,
      point_integration_wh: WebhookEventType.POINT_INTEGRATION,
      merchant_order: WebhookEventType.MERCHANT_ORDER,
    };

    return typeMap[type.toLowerCase()] || (type as WebhookEventType);
  }

  /**
   * Identifica o tipo de integração com base no tipo de evento
   * @param eventType Tipo de evento normalizado
   * @returns Tipo de integração correspondente
   */
  public static getIntegrationTypeFromEvent(
    eventType: WebhookEventType
  ): MercadoPagoIntegrationType {
    // Mapeamento de tipos de evento para tipos de integração
    switch (eventType) {
      case WebhookEventType.SUBSCRIPTION:
      case WebhookEventType.PLAN:
      case WebhookEventType.INVOICE:
        return MercadoPagoIntegrationType.SUBSCRIPTION;

      case WebhookEventType.PAYMENT:
      case WebhookEventType.MERCHANT_ORDER:
      case WebhookEventType.POINT_INTEGRATION:
      default:
        return MercadoPagoIntegrationType.CHECKOUT;
    }
  }
}
