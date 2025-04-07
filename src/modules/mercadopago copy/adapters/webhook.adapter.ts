import { MerchantOrder } from "mercadopago";
import { logger } from "@/shared/utils/logger.utils";
import {
  WebhookNotification,
  MerchantOrderResponse,
} from "../types/webhook-custom.types";

export class WebhookAdapter {
  private merchantOrderClient: MerchantOrder;

  /**
   * Construtor do adaptador
   * @param merchantOrderClient Cliente do SDK oficial do MercadoPago
   */
  constructor(merchantOrderClient: MerchantOrder) {
    this.merchantOrderClient = merchantOrderClient;
  }

  /**
   * Obtém detalhes de uma ordem de mercador
   * @param id ID da ordem
   * @returns Dados da ordem de mercador
   */
  public async getMerchantOrder(
    id: string | number
  ): Promise<MerchantOrderResponse> {
    try {
      let response;

      try {
        // Primeira tentativa: passando ID como objeto com propriedade 'id'
        response = await this.merchantOrderClient.get({ id } as any);
      } catch (error) {
        // Segunda tentativa: passando ID diretamente
        logger.debug(
          "Primeira tentativa de obtenção de ordem falhou, tentando método alternativo",
          { error }
        );
        response = await this.merchantOrderClient.get(id as any);
      }

      // Usando "double assertion" para conversão segura
      return response as unknown as MerchantOrderResponse;
    } catch (error) {
      logger.error(
        `Erro ao obter ordem de mercador ${id} no MercadoPago`,
        error
      );
      throw error;
    }
  }

  /**
   * Verifica a assinatura de um webhook para garantir autenticidade
   * @param payload Conteúdo do webhook (como string JSON)
   * @param signature Assinatura recebida
   * @param webhookSecret Segredo usado para verificar a assinatura
   * @returns true se a assinatura for válida
   */
  public verifySignature(
    payload: string,
    signature: string,
    webhookSecret: string
  ): boolean {
    try {
      const crypto = require("crypto");
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(payload)
        .digest("hex");

      return signature === expectedSignature;
    } catch (error) {
      logger.error("Erro ao verificar assinatura de webhook", error);
      return false;
    }
  }

  /**
   * Normaliza uma notificação de webhook para garantir estrutura consistente
   * @param notification Notificação original
   * @returns Notificação normalizada
   */
  public normalizeNotification(notification: any): WebhookNotification {
    // Garantindo que campos importantes existam e tenham formato adequado
    const normalized: WebhookNotification = {
      type: notification.type || "unknown",
      date_created: notification.date_created || new Date().toISOString(),
      id: notification.id,
      data: notification.data || undefined,
    };

    return { ...notification, ...normalized };
  }
}
