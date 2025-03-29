/**
 * Controlador para processamento de webhooks do MercadoPago
 * @module modules/mercadopago/controllers/webhook.controller
 */

import { Request, Response } from "express";
import { logger } from "@/shared/utils/logger.utils";
import {
  WebhookService,
  checkoutWebhookService,
  subscriptionWebhookService,
  WebhookTopicType,
  WebhookNotification,
} from "../services/webhook.service";
import { MercadoPagoIntegrationType } from "../config/credentials";
import { ApiResponse } from "@/shared/utils/api-response.utils";

/**
 * Controlador para processamento de webhooks do MercadoPago
 */
export class WebhookController {
  /**
   * Processa webhooks do MercadoPago
   * @route POST /api/mercadopago/webhook
   */
  public async processWebhook(req: Request, res: Response): Promise<void> {
    try {
      const notification = req.body as WebhookNotification;

      // Log inicial da notificação recebida
      logger.info("Webhook do MercadoPago recebido", {
        id: notification.id,
        type: notification.type,
        dataId: notification.data?.id,
      });

      // Determina qual serviço usar com base no tipo de notificação
      let webhookService: WebhookService;

      if (
        notification.type === WebhookTopicType.SUBSCRIPTION ||
        notification.type === WebhookTopicType.INVOICE
      ) {
        webhookService = subscriptionWebhookService;
      } else {
        webhookService = checkoutWebhookService;
      }

      // Verifica a assinatura do webhook (se disponível no cabeçalho)
      const signature = req.headers["x-signature"] as string;

      if (signature) {
        const rawBody = JSON.stringify(req.body);
        const isValid = webhookService.verifySignature(rawBody, signature);

        if (!isValid) {
          logger.warn(
            "Assinatura de webhook inválida, processando mesmo assim"
          );
          // Opcionalmente, você pode rejeitar a requisição aqui
          // return ApiResponse.error(res, 'Assinatura inválida', { code: 'INVALID_SIGNATURE', statusCode: 401 });
        }
      }

      // Processa a notificação
      const result = await webhookService.processWebhook(notification);

      // Responde com sucesso
      ApiResponse.success(res, result, {
        message: "Webhook processado com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      logger.error("Erro ao processar webhook do MercadoPago", error);

      // Responde com erro, mas com status 200 para evitar reenvios pelo MercadoPago
      ApiResponse.success(
        res,
        {
          success: false,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        },
        {
          message: "Webhook recebido com erro, não reenviar",
          statusCode: 200,
        }
      );
    }
  }
}

// Exporta a instância do controlador
export const webhookController = new WebhookController();
