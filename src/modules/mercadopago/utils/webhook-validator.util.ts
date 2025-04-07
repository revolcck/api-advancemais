/**
 * Utilitário para validação de webhooks do MercadoPago
 * @module modules/mercadopago/utils/webhook-validator.util
 */

import crypto from "crypto";
import { logger } from "@/shared/utils/logger.utils";
import { mercadoPagoConfig } from "../config/mercadopago.config";

/**
 * Implementação da interface IWebhookValidator para o MercadoPago
 */
export class MercadoPagoWebhookValidator {
  /**
   * Verifica a assinatura de um webhook do MercadoPago
   *
   * @param payload Payload do webhook em formato string
   * @param signature Assinatura recebida no cabeçalho x-signature
   * @returns true se a assinatura for válida, false caso contrário
   */
  public static verifySignature(payload: string, signature: string): boolean {
    try {
      // Se não há configuração de segredo, não podemos validar
      const secret = mercadoPagoConfig.getWebhookSecret();
      if (!secret) {
        logger.warn(
          "Webhook recebido, mas secret não está configurado para validação"
        );
        return true;
      }

      // Se não há assinatura, não podemos validar
      if (!signature) {
        logger.warn("Webhook recebido sem assinatura no cabeçalho");
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
        });
      } else {
        logger.debug("Assinatura de webhook validada com sucesso");
      }

      return isValid;
    } catch (error) {
      logger.error("Erro ao validar assinatura de webhook", error);
      return false;
    }
  }

  /**
   * Processa o tipo de notificação e retorna uma chave padronizada
   *
   * @param type Tipo de notificação do webhook
   * @returns Tipo normalizado para processamento interno
   */
  public static normalizeNotificationType(type: string): string {
    // Mapeamento de tipos de notificação do MercadoPago para tipos internos
    const typeMap: Record<string, string> = {
      payment: "payment",
      plan: "subscription_plan",
      subscription: "subscription",
      invoice: "subscription_invoice",
      point_integration_wh: "point_integration",
      merchant_order: "merchant_order",
    };

    return typeMap[type] || type;
  }
}
