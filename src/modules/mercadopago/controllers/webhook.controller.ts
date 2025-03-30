/**
 * Controlador para processamento de webhooks do MercadoPago
 * @module modules/mercadopago/controllers/webhook.controller
 */

import { Request, Response } from "express";
import { logger } from "@/shared/utils/logger.utils";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import {
  checkoutWebhookService,
  subscriptionWebhookService,
  WebhookTopicType,
} from "../services/webhook.service";
import { WebhookNotificationRequest } from "../dtos/mercadopago.dto";
import { MercadoPagoIntegrationType } from "../config/credentials";

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
      const notification = req.body as WebhookNotificationRequest;

      // Log inicial da notificação recebida
      logger.info("Webhook do MercadoPago recebido", {
        id: notification.id,
        type: notification.type,
        dataId: notification.data?.id,
      });

      // Determina qual serviço usar com base no tipo de notificação
      let webhookService;

      if (
        notification.type === WebhookTopicType.SUBSCRIPTION ||
        notification.type === WebhookTopicType.INVOICE ||
        notification.type === WebhookTopicType.PLAN
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
            "Assinatura de webhook inválida, processando mesmo assim para evitar perda de notificações"
          );
          // Opcionalmente, você pode rejeitar a requisição aqui
          // return ApiResponse.error(res, 'Assinatura inválida', { code: 'INVALID_SIGNATURE', statusCode: 401 });
        }
      }

      // Processa a notificação
      const result = await webhookService.processWebhook(notification);

      // Responde com sucesso, mesmo em caso de erro para evitar reenvios pelo MercadoPago
      ApiResponse.success(res, result, {
        message: "Webhook processado",
        statusCode: 200,
      });
    } catch (error) {
      logger.error("Erro ao processar webhook do MercadoPago", error);

      // Responde com sucesso mesmo com erro para evitar reenvios pelo MercadoPago
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

  /**
   * Processa webhooks específicos de assinatura
   * @route POST /api/mercadopago/webhook/subscription
   */
  public async processSubscriptionWebhook(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const notification = req.body as WebhookNotificationRequest;

      logger.info("Webhook de assinatura MercadoPago recebido", {
        id: notification.id,
        type: notification.type,
        dataId: notification.data?.id,
      });

      // Força o uso do serviço de assinatura
      const result = await subscriptionWebhookService.processWebhook(
        notification
      );

      // Responde com sucesso
      ApiResponse.success(res, result, {
        message: "Webhook de assinatura processado",
        statusCode: 200,
      });
    } catch (error) {
      logger.error("Erro ao processar webhook de assinatura", error);

      // Responde com sucesso mesmo com erro para evitar reenvios pelo MercadoPago
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

  /**
   * Processa webhooks específicos de pagamento
   * @route POST /api/mercadopago/webhook/payment
   */
  public async processPaymentWebhook(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const notification = req.body as WebhookNotificationRequest;

      logger.info("Webhook de pagamento MercadoPago recebido", {
        id: notification.id,
        type: notification.type,
        dataId: notification.data?.id,
      });

      // Força o uso do serviço de checkout
      const result = await checkoutWebhookService.processWebhook(notification);

      // Responde com sucesso
      ApiResponse.success(res, result, {
        message: "Webhook de pagamento processado",
        statusCode: 200,
      });
    } catch (error) {
      logger.error("Erro ao processar webhook de pagamento", error);

      // Responde com sucesso mesmo com erro para evitar reenvios pelo MercadoPago
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

export const webhookController = new WebhookController();
