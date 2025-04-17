import { Request, Response } from "express";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { logger } from "@/shared/utils/logger.utils";
import { WebhookService } from "../services/webhook.service";
import { validateWebhookSignature } from "../../utils/mercadopago.util";
import { env } from "@/config/environment";

/**
 * Controlador para endpoints de webhook do MercadoPago
 */
export class WebhookController {
  private webhookService: WebhookService;

  constructor() {
    this.webhookService = new WebhookService();
  }

  /**
   * Processa uma notificação recebida do MercadoPago
   * @route POST /api/mercadopago/webhooks
   */
  public handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info("Webhook do MercadoPago recebido", {
        type: req.query.type || req.body.type || req.body.action,
        id: req.query.id || req.body.id || req.body.data?.id,
      });

      // Valida assinatura do webhook em ambiente de produção
      if (env.isProduction && env.mercadoPago.webhookSecret) {
        const signature = req.headers["x-signature"] as string;

        if (
          !validateWebhookSignature(
            req.body,
            signature,
            env.mercadoPago.webhookSecret
          )
        ) {
          logger.warn("Assinatura do webhook inválida", {
            signature,
            body: JSON.stringify(req.body).substring(0, 100) + "...",
          });

          ApiResponse.error(res, "Assinatura inválida", {
            statusCode: 401,
            code: "INVALID_SIGNATURE",
          });
          return;
        }
      }

      // Processa a notificação
      const result = await this.webhookService.processWebhook(req.body);

      // Se o processamento foi bem-sucedido, retorna 200 OK
      if (result.success) {
        ApiResponse.success(
          res,
          { received: true },
          {
            message: result.message,
          }
        );
      } else {
        // Se houve problema no processamento, retorna 202 Accepted
        // para evitar que o MercadoPago reenvie a notificação
        res.status(202).json({
          status: "partial_processing",
          message: result.message,
        });
      }
    } catch (error) {
      logger.error("Erro ao processar webhook do MercadoPago", error);

      // Mesmo com erro, retornamos 202 para evitar reenvios
      res.status(202).json({
        status: "error",
        message: "Erro ao processar notificação",
      });
    }
  };

  /**
   * Endpoint para teste de webhooks
   * @route GET /api/mercadopago/webhooks/test
   */
  public testWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      // Apenas disponível em ambientes de desenvolvimento
      if (!env.isDevelopment) {
        ApiResponse.error(
          res,
          "Endpoint disponível apenas em ambiente de desenvolvimento",
          {
            statusCode: 403,
            code: "FORBIDDEN",
          }
        );
        return;
      }

      ApiResponse.success(res, {
        message: "Endpoint de teste de webhook disponível",
        environment: env.nodeEnv,
        webhookUrl: `${env.appUrl}/api/mercadopago/webhooks`,
      });
    } catch (error) {
      logger.error("Erro no endpoint de teste de webhook", error);
      throw error;
    }
  };
}
