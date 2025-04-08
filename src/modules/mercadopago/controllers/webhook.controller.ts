/**
 * Controlador para webhooks do MercadoPago
 * @module modules/mercadopago/controllers/webhook.controller
 */

import { Request, Response } from "express";
import { logger } from "@/shared/utils/logger.utils";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { MercadoPagoIntegrationType } from "../enums";
import { WebhookValidator } from "../utils/webhook-validator.util";
import { WebhookEventType } from "../types/events.types";
import { WebhookService } from "../services/webhook.service";

/**
 * Controlador para gerenciamento de webhooks do MercadoPago
 */
export class WebhookController {
  private webhookService: WebhookService;

  /**
   * Inicializa o controlador com o serviço de webhook
   */
  constructor() {
    this.webhookService = new WebhookService();
  }

  /**
   * Manipulador genérico de webhooks do MercadoPago
   * @route POST /api/mercadopago/webhooks
   */
  public handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.debug("Webhook recebido do MercadoPago", {
        body: req.body,
        headers: {
          "x-signature": req.headers["x-signature"] || "não fornecido",
          "content-type": req.headers["content-type"],
          "user-agent": req.headers["user-agent"],
        },
      });

      // Verifica a assinatura do webhook (se configurada)
      const signatureHeader = req.headers["x-signature"] as string;
      const rawBody = JSON.stringify(req.body);

      // Determina o tipo de integração a partir do tipo de evento
      const type = req.body.type || "";
      const eventType = WebhookValidator.normalizeEventType(type);
      const integrationType =
        WebhookValidator.getIntegrationTypeFromEvent(eventType);

      // Valida a assinatura se fornecida
      if (signatureHeader) {
        const isSignatureValid = WebhookValidator.verifySignature(
          rawBody,
          signatureHeader,
          integrationType
        );

        if (!isSignatureValid) {
          logger.warn("Assinatura de webhook inválida", {
            signature: signatureHeader,
            integrationType,
            type,
          });
          ApiResponse.error(res, "Assinatura inválida", {
            code: "INVALID_SIGNATURE",
            statusCode: 401,
          });
          return;
        }
      }

      // Processa o webhook
      const result = await this.webhookService.processWebhook({
        ...req.body,
        integrationType,
      });

      // Retorna resposta apropriada
      if (result.success) {
        ApiResponse.success(
          res,
          {
            action: result.type,
            resourceId: result.resourceId,
          },
          {
            message: result.message || "Webhook processado com sucesso",
          }
        );
      } else {
        // Mesmo com erro, retornamos 200 para evitar reenvios repetidos
        ApiResponse.success(
          res,
          {
            action: result.type,
            resourceId: result.resourceId,
            errorCode: result.errorCode,
          },
          {
            message:
              result.error ||
              "Webhook recebido, mas ocorreu um erro no processamento",
          }
        );
      }
    } catch (error) {
      logger.error("Erro ao processar webhook do MercadoPago", error);

      // Retornamos 200 mesmo em caso de erro para evitar reenvios repetidos
      ApiResponse.success(
        res,
        {
          error: error instanceof Error ? error.message : "Erro desconhecido",
        },
        {
          message: "Webhook recebido, mas ocorreu um erro no processamento",
        }
      );
    }
  };

  /**
   * Manipulador específico para webhooks do Checkout Pro
   * @route POST /api/mercadopago/webhooks/checkout
   */
  public handleCheckoutWebhook = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      logger.debug("Webhook de Checkout Pro recebido do MercadoPago", {
        body: req.body,
      });

      // Força o tipo de integração
      const integrationType = MercadoPagoIntegrationType.CHECKOUT;

      // Verifica a assinatura do webhook (se configurada)
      const signatureHeader = req.headers["x-signature"] as string;
      const rawBody = JSON.stringify(req.body);

      // Valida a assinatura se fornecida
      if (signatureHeader) {
        const isSignatureValid = WebhookValidator.verifySignature(
          rawBody,
          signatureHeader,
          integrationType
        );

        if (!isSignatureValid) {
          logger.warn("Assinatura de webhook de checkout inválida", {
            signature: signatureHeader,
          });
          ApiResponse.error(res, "Assinatura inválida", {
            code: "INVALID_SIGNATURE",
            statusCode: 401,
          });
          return;
        }
      }

      // Processa o webhook
      const result = await this.webhookService.processWebhook({
        ...req.body,
        integrationType,
      });

      // Retorna resposta apropriada (sempre 200, mesmo em erro)
      if (result.success) {
        ApiResponse.success(
          res,
          {
            action: result.type,
            resourceId: result.resourceId,
          },
          {
            message:
              result.message || "Webhook de checkout processado com sucesso",
          }
        );
      } else {
        ApiResponse.success(
          res,
          {
            action: result.type,
            resourceId: result.resourceId,
            errorCode: result.errorCode,
          },
          {
            message:
              result.error ||
              "Webhook de checkout recebido, mas ocorreu um erro no processamento",
          }
        );
      }
    } catch (error) {
      logger.error(
        "Erro ao processar webhook de checkout do MercadoPago",
        error
      );

      ApiResponse.success(
        res,
        {
          error: error instanceof Error ? error.message : "Erro desconhecido",
        },
        {
          message:
            "Webhook de checkout recebido, mas ocorreu um erro no processamento",
        }
      );
    }
  };

  /**
   * Manipulador específico para webhooks de Assinaturas
   * @route POST /api/mercadopago/webhooks/subscription
   */
  public handleSubscriptionWebhook = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      logger.debug("Webhook de Assinatura recebido do MercadoPago", {
        body: req.body,
      });

      // Força o tipo de integração
      const integrationType = MercadoPagoIntegrationType.SUBSCRIPTION;

      // Verifica a assinatura do webhook (se configurada)
      const signatureHeader = req.headers["x-signature"] as string;
      const rawBody = JSON.stringify(req.body);

      // Valida a assinatura se fornecida
      if (signatureHeader) {
        const isSignatureValid = WebhookValidator.verifySignature(
          rawBody,
          signatureHeader,
          integrationType
        );

        if (!isSignatureValid) {
          logger.warn("Assinatura de webhook de assinatura inválida", {
            signature: signatureHeader,
          });
          ApiResponse.error(res, "Assinatura inválida", {
            code: "INVALID_SIGNATURE",
            statusCode: 401,
          });
          return;
        }
      }

      // Processa o webhook
      const result = await this.webhookService.processWebhook({
        ...req.body,
        integrationType,
      });

      // Retorna resposta apropriada (sempre 200, mesmo em erro)
      if (result.success) {
        ApiResponse.success(
          res,
          {
            action: result.type,
            resourceId: result.resourceId,
          },
          {
            message:
              result.message || "Webhook de assinatura processado com sucesso",
          }
        );
      } else {
        ApiResponse.success(
          res,
          {
            action: result.type,
            resourceId: result.resourceId,
            errorCode: result.errorCode,
          },
          {
            message:
              result.error ||
              "Webhook de assinatura recebido, mas ocorreu um erro no processamento",
          }
        );
      }
    } catch (error) {
      logger.error(
        "Erro ao processar webhook de assinatura do MercadoPago",
        error
      );

      ApiResponse.success(
        res,
        {
          error: error instanceof Error ? error.message : "Erro desconhecido",
        },
        {
          message:
            "Webhook de assinatura recebido, mas ocorreu um erro no processamento",
        }
      );
    }
  };
}
