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
import { prisma } from "@/config/database";
import { mercadoPagoConfig } from "../config/mercadopago.config";

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

      // Verifica se é um webhook de teste
      const isTestWebhook = WebhookValidator.isTestWebhook(req.body);
      if (isTestWebhook) {
        logger.debug("Webhook de teste detectado", { body: req.body });
      }

      // Verifica a assinatura do webhook (se configurada)
      const signatureHeader = req.headers["x-signature"] as string;
      const rawBody = JSON.stringify(req.body);

      // Determina o tipo de integração a partir do tipo de evento
      const type = req.body.type || "";
      const eventType = WebhookValidator.normalizeEventType(type);
      const integrationType =
        WebhookValidator.getIntegrationTypeFromEvent(eventType);

      // Verificação mais flexível em ambiente de teste
      const isTestMode = mercadoPagoConfig.isTestMode(integrationType);

      // Valida a assinatura apenas se fornecida e não for modo de teste ou webhook de teste
      if (signatureHeader && !isTestMode && !isTestWebhook) {
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
      // Se é webhook de teste ou estamos em modo de teste, aceitamos mesmo sem validação
      else if (signatureHeader && (isTestMode || isTestWebhook)) {
        logger.debug(
          "Webhook aceito sem validação rigorosa por ser ambiente de teste ou webhook de teste",
          {
            isTestMode,
            isTestWebhook,
            signature: signatureHeader?.substring(0, 10) + "...",
          }
        );
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

      // Verifica se é um webhook de teste
      const isTestWebhook = WebhookValidator.isTestWebhook(req.body);
      if (isTestWebhook) {
        logger.debug("Webhook de Checkout teste detectado", { body: req.body });
      }

      // Força o tipo de integração
      const integrationType = MercadoPagoIntegrationType.CHECKOUT;

      // Verifica a assinatura do webhook (se configurada)
      const signatureHeader = req.headers["x-signature"] as string;
      const rawBody = JSON.stringify(req.body);

      // Verificação mais flexível em ambiente de teste
      const isTestMode = mercadoPagoConfig.isTestMode(integrationType);

      // Em ambiente de teste ou webhook de teste, sempre aceita
      if (isTestMode || isTestWebhook) {
        logger.debug(
          "Webhook de checkout aceito automaticamente em ambiente de teste",
          {
            isTestMode,
            isTestWebhook,
          }
        );
      }
      // Em produção, valida a assinatura se fornecida
      else if (signatureHeader) {
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

      // Verifica se é um webhook de teste
      const isTestWebhook = WebhookValidator.isTestWebhook(req.body);
      if (isTestWebhook) {
        logger.debug("Webhook de Assinatura teste detectado", {
          body: req.body,
        });
      }

      // Força o tipo de integração
      const integrationType = MercadoPagoIntegrationType.SUBSCRIPTION;

      // Verifica a assinatura do webhook (se configurada)
      const signatureHeader = req.headers["x-signature"] as string;
      const rawBody = JSON.stringify(req.body);

      // Verificação mais flexível em ambiente de teste
      const isTestMode = mercadoPagoConfig.isTestMode(integrationType);

      // Em ambiente de teste ou webhook de teste, sempre aceita
      if (isTestMode || isTestWebhook) {
        logger.debug(
          "Webhook de assinatura aceito automaticamente em ambiente de teste",
          {
            isTestMode,
            isTestWebhook,
          }
        );
      }
      // Em produção, valida a assinatura se fornecida
      else if (signatureHeader) {
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

  /**
   * Consulta o histórico de webhooks recebidos
   * @route GET /api/mercadopago/webhooks/history
   */
  public getWebhookHistory = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const eventType = req.query.eventType as string;
      const status = req.query.status as string;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      // Construir filtros para a consulta
      const filters: any = {
        source: "mercadopago",
      };

      if (eventType) {
        filters.eventType = eventType;
      }

      if (status) {
        filters.processStatus = status;
      }

      if (startDate || endDate) {
        filters.createdAt = {};

        if (startDate) {
          filters.createdAt.gte = startDate;
        }

        if (endDate) {
          filters.createdAt.lte = endDate;
        }
      }

      // Consultar total de registros
      const total = await prisma.webhookNotification.count({
        where: filters,
      });

      // Consultar registros com paginação
      const webhooks = await prisma.webhookNotification.findMany({
        where: filters,
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: (page - 1) * limit,
        select: {
          id: true,
          eventType: true,
          eventId: true,
          processStatus: true,
          processedAt: true,
          error: true,
          createdAt: true,
          liveMode: true,
          apiVersion: true,
        },
      });

      // Retornar resultado paginado
      ApiResponse.success(res, {
        data: webhooks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error("Erro ao consultar histórico de webhooks", error);

      ApiResponse.error(res, "Erro ao consultar histórico de webhooks", {
        statusCode: 500,
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  };
}
