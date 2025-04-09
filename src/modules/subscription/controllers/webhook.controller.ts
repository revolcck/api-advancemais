/**
 * Controlador para webhooks de assinatura
 * @module modules/subscription/controllers/webhook.controller
 */

import { Request, Response } from "express";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { SubscriptionWebhookService } from "../services/webhook.service";
import { logger } from "@/shared/utils/logger.utils";
import {
  validate,
  ValidateSource,
} from "@/shared/middleware/validate.middleware";
import {
  processWebhookSchema,
  verifyWebhookSchema,
} from "../validators/webhook.validators";
import { WebhookValidator } from "@/modules/mercadopago/utils/webhook-validator.util";
import { MercadoPagoIntegrationType } from "@/modules/mercadopago/enums";
import { WebhookEventType } from "@/modules/mercadopago/types/events.types";
import { prisma } from "@/config/database";

/**
 * Controlador para processamento de webhooks de assinatura
 */
export class WebhookController {
  private webhookService: SubscriptionWebhookService;

  /**
   * Inicializa o controlador com os serviços necessários
   */
  constructor() {
    this.webhookService = new SubscriptionWebhookService();
  }

  /**
   * Processa webhooks de assinatura do MercadoPago
   * @route POST /api/subscription/webhooks
   */
  public processWebhook = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const webhook = req.body;

      // Log do webhook recebido
      logger.debug("Webhook de assinatura recebido", {
        type: webhook.type,
        action: webhook.action,
        data: webhook.data,
      });

      // Verifica a assinatura, se fornecida
      const signature = req.headers["x-signature"] as string;
      if (signature) {
        const rawBody = JSON.stringify(req.body);
        const isValid = WebhookValidator.verifySignature(
          rawBody,
          signature,
          MercadoPagoIntegrationType.SUBSCRIPTION
        );

        if (!isValid) {
          logger.warn("Assinatura de webhook inválida", {
            signature,
            type: webhook.type,
          });

          // Sempre retorna 200 para evitar tentativas repetidas, mas registra o erro
          ApiResponse.success(res, {
            success: false,
            message: "Assinatura inválida, webhook rejeitado",
            valid: false,
          });
          return;
        }
      }

      // Normaliza o tipo de evento
      const eventType = WebhookValidator.normalizeEventType(webhook.type);

      // Processa o webhook
      const result = await this.webhookService.processEvent(
        eventType as WebhookEventType,
        webhook.data,
        webhook.id
      );

      if (result.success) {
        ApiResponse.success(
          res,
          {
            ...result,
            eventType,
            resourceId:
              result.subscriptionId || result.paymentId || webhook.data?.id,
          },
          {
            message: result.message || "Webhook processado com sucesso",
          }
        );
      } else {
        // Retorna 200 mesmo em caso de erro para não causar reenvio pelo MercadoPago
        ApiResponse.success(
          res,
          {
            ...result,
            eventType,
            error: result.error,
            errorCode: result.errorCode,
            resourceId: webhook.data?.id,
          },
          {
            message:
              result.message ||
              "Webhook recebido, mas ocorreu um erro no processamento",
          }
        );
      }
    } catch (error) {
      logger.error("Erro ao processar webhook de assinatura:", error);

      // Retorna 200 mesmo em caso de erro para evitar reenvios
      ApiResponse.success(
        res,
        {
          success: false,
          error: error instanceof Error ? error.message : "Erro desconhecido",
          processed: false,
        },
        {
          message: "Webhook recebido, mas ocorreu um erro no processamento",
        }
      );
    }
  };

  /**
   * Verifica a assinatura de um webhook
   * @route POST /api/subscription/webhooks/verify
   */
  public verifyWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { signature, payload, type } = req.body;

      const integrationType = type
        ? WebhookValidator.getIntegrationTypeFromEvent(type as WebhookEventType)
        : MercadoPagoIntegrationType.SUBSCRIPTION;

      const isValid = WebhookValidator.verifySignature(
        payload,
        signature,
        integrationType
      );

      ApiResponse.success(res, {
        valid: isValid,
        type: integrationType,
      });
    } catch (error) {
      logger.error("Erro ao verificar assinatura de webhook:", error);
      ApiResponse.error(res, "Erro ao verificar assinatura de webhook", {
        code: "WEBHOOK_VERIFICATION_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Lista webhooks recebidos com paginação
   * @route GET /api/subscription/webhooks/history
   */
  public getWebhookHistory = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Parâmetros de consulta
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as string;
      const status = req.query.status as string;

      // Filtros
      const where: any = { source: "mercadopago" };

      if (type) {
        where.eventType = type;
      }

      if (status) {
        where.processStatus = status;
      }

      // Contagem total
      const total = await prisma.webhookNotification.count({ where });

      // Busca paginada
      const webhooks = await prisma.webhookNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          eventType: true,
          eventId: true,
          processStatus: true,
          processedAt: true,
          error: true,
          createdAt: true,
          liveMode: true,
        },
      });

      ApiResponse.paginated(res, webhooks, {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      });
    } catch (error) {
      logger.error("Erro ao buscar histórico de webhooks:", error);
      ApiResponse.error(res, "Erro ao buscar histórico de webhooks", {
        code: "WEBHOOK_HISTORY_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Middleware de validação para processamento de webhook
   */
  public validateWebhook = validate(processWebhookSchema, ValidateSource.BODY);

  /**
   * Middleware de validação para verificação de webhook
   */
  public validateWebhookVerification = validate(
    verifyWebhookSchema,
    ValidateSource.BODY
  );
}

// Instância do controlador para exportação
export const webhookController = new WebhookController();
