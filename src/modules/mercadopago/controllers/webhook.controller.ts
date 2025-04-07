/**
 * Controlador para processamento de webhooks do MercadoPago
 * @module modules/mercadopago/controllers/webhook.controller
 */

import { Request, Response } from "express";
import { logger } from "@/shared/utils/logger.utils";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { MercadoPagoWebhookValidator } from "../utils/webhook-validator.util";
import { mercadoPagoCoreService } from "../services/core.service";
import {
  WebhookNotification,
  WebhookProcessResponse,
} from "../types/common.types";
import { AuditService, AuditAction } from "@/shared/services/audit.service";

/**
 * Controlador para processar webhooks do MercadoPago
 */
class WebhookController {
  /**
   * Processa um webhook genérico do MercadoPago
   * Identifica o tipo de webhook e direciona para o processador específico
   *
   * @route POST /api/mercadopago/webhook
   */
  public async processWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Log da requisição recebida
      logger.debug("Webhook do MercadoPago recebido", {
        body: req.body,
        headers: {
          "user-agent": req.headers["user-agent"],
          "x-signature": req.headers["x-signature"],
        },
      });

      // Validação da assinatura
      const rawBody = JSON.stringify(req.body);
      const signature = req.headers["x-signature"] as string;

      if (!MercadoPagoWebhookValidator.verifySignature(rawBody, signature)) {
        logger.warn("Assinatura de webhook inválida", { signature });
        ApiResponse.error(res, "Assinatura inválida", {
          statusCode: 401,
          code: "INVALID_SIGNATURE",
        });
        return;
      }

      // Obtém o tipo de notificação
      const notification = req.body as WebhookNotification;
      const notificationType = notification.type || "unknown";
      const normalizedType =
        MercadoPagoWebhookValidator.normalizeNotificationType(notificationType);

      // Registra a operação como auditoria
      AuditService.log(
        AuditAction.CREATE,
        `mercadopago_webhook_${normalizedType}`,
        notification.data?.id,
        undefined,
        { notification }
      );

      let result: WebhookProcessResponse;

      // Direciona para o processador específico com base no tipo
      switch (normalizedType) {
        case "payment":
          result = await this.processPaymentWebhook(notification);
          break;
        case "subscription":
          result = await this.processSubscriptionWebhook(notification);
          break;
        case "merchant_order":
          result = await this.processMerchantOrderWebhook(notification);
          break;
        default:
          // Para outros tipos, usamos um processador genérico
          result = await this.processGenericWebhook(notification);
      }

      // Retorna a resposta com base no resultado do processamento
      if (result.success) {
        ApiResponse.success(
          res,
          {
            type: normalizedType,
            resourceId: result.resourceId,
            message: result.message,
          },
          {
            message: `Webhook processado com sucesso: ${normalizedType}`,
            statusCode: 200,
          }
        );
      } else {
        ApiResponse.error(res, result.error || "Erro ao processar webhook", {
          code: result.errorCode || "WEBHOOK_PROCESSING_ERROR",
          statusCode: 422,
          meta: {
            type: normalizedType,
            resourceId: result.resourceId,
          },
        });
      }
    } catch (error) {
      logger.error("Erro ao processar webhook do MercadoPago", error);
      ApiResponse.error(res, "Erro interno ao processar webhook", {
        statusCode: 500,
        code: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Processa especificamente webhooks de pagamento
   * @route POST /api/mercadopago/webhook/payment
   */
  public async processPaymentWebhook(
    notification: WebhookNotification
  ): Promise<WebhookProcessResponse> {
    try {
      const resourceId = notification.data?.id;

      if (!resourceId) {
        return {
          success: false,
          type: "payment",
          error: "ID do recurso não encontrado na notificação",
          errorCode: "INVALID_RESOURCE_ID",
        };
      }

      logger.info(`Processando webhook de pagamento: ${resourceId}`);

      // Busca informações detalhadas do pagamento
      // Utilizar o adaptador para obter os detalhes
      const paymentAdapter = mercadoPagoCoreService.getPaymentAdapter();
      const paymentDetails = await paymentAdapter.get(resourceId);

      if (!paymentDetails) {
        return {
          success: false,
          type: "payment",
          resourceId,
          error: "Não foi possível obter detalhes do pagamento",
          errorCode: "PAYMENT_DETAILS_NOT_FOUND",
        };
      }

      // Aqui você implementaria a lógica de negócio para processar o pagamento
      // Por exemplo, atualizar o status de um pedido no seu sistema

      // Resposta de sucesso
      return {
        success: true,
        type: "payment",
        resourceId,
        message: `Pagamento ${resourceId} processado com sucesso`,
        data: {
          status: paymentDetails.status,
          externalReference: paymentDetails.external_reference,
        },
      };
    } catch (error) {
      logger.error(`Erro ao processar webhook de pagamento`, error);
      return {
        success: false,
        type: "payment",
        resourceId: notification.data?.id,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        errorCode: "PAYMENT_WEBHOOK_ERROR",
      };
    }
  }

  /**
   * Processa especificamente webhooks de assinatura
   * @route POST /api/mercadopago/webhook/subscription
   */
  public async processSubscriptionWebhook(
    notification: WebhookNotification
  ): Promise<WebhookProcessResponse> {
    try {
      const resourceId = notification.data?.id;

      if (!resourceId) {
        return {
          success: false,
          type: "subscription",
          error: "ID do recurso não encontrado na notificação",
          errorCode: "INVALID_RESOURCE_ID",
        };
      }

      logger.info(`Processando webhook de assinatura: ${resourceId}`);

      // Busca informações detalhadas da assinatura
      const subscriptionAdapter =
        mercadoPagoCoreService.getSubscriptionAdapter();
      const subscriptionDetails = await subscriptionAdapter.get(resourceId);

      if (!subscriptionDetails) {
        return {
          success: false,
          type: "subscription",
          resourceId,
          error: "Não foi possível obter detalhes da assinatura",
          errorCode: "SUBSCRIPTION_DETAILS_NOT_FOUND",
        };
      }

      // Aqui você implementaria a lógica de negócio para processar a assinatura
      // Por exemplo, atualizar o status de uma assinatura no seu sistema

      // Resposta de sucesso
      return {
        success: true,
        type: "subscription",
        resourceId,
        message: `Assinatura ${resourceId} processada com sucesso`,
        data: {
          status: subscriptionDetails.status,
          externalReference: subscriptionDetails.external_reference,
        },
      };
    } catch (error) {
      logger.error(`Erro ao processar webhook de assinatura`, error);
      return {
        success: false,
        type: "subscription",
        resourceId: notification.data?.id,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        errorCode: "SUBSCRIPTION_WEBHOOK_ERROR",
      };
    }
  }

  /**
   * Processa especificamente webhooks de ordem do mercador
   */
  public async processMerchantOrderWebhook(
    notification: WebhookNotification
  ): Promise<WebhookProcessResponse> {
    try {
      const resourceId = notification.data?.id;

      if (!resourceId) {
        return {
          success: false,
          type: "merchant_order",
          error: "ID do recurso não encontrado na notificação",
          errorCode: "INVALID_RESOURCE_ID",
        };
      }

      logger.info(`Processando webhook de ordem do mercador: ${resourceId}`);

      // Busca informações detalhadas da ordem
      const merchantOrderAdapter =
        mercadoPagoCoreService.getMerchantOrderAdapter();
      const orderDetails = await merchantOrderAdapter.get(resourceId);

      if (!orderDetails) {
        return {
          success: false,
          type: "merchant_order",
          resourceId,
          error: "Não foi possível obter detalhes da ordem",
          errorCode: "ORDER_DETAILS_NOT_FOUND",
        };
      }

      // Aqui você implementaria a lógica de negócio para processar a ordem
      // Por exemplo, atualizar o status de um pedido no seu sistema

      // Resposta de sucesso
      return {
        success: true,
        type: "merchant_order",
        resourceId,
        message: `Ordem ${resourceId} processada com sucesso`,
        data: {
          status: orderDetails.status,
          externalReference: orderDetails.external_reference,
        },
      };
    } catch (error) {
      logger.error(`Erro ao processar webhook de ordem do mercador`, error);
      return {
        success: false,
        type: "merchant_order",
        resourceId: notification.data?.id,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        errorCode: "MERCHANT_ORDER_WEBHOOK_ERROR",
      };
    }
  }

  /**
   * Processa tipos genéricos de webhook
   */
  private async processGenericWebhook(
    notification: WebhookNotification
  ): Promise<WebhookProcessResponse> {
    try {
      const resourceId = notification.data?.id;
      const notificationType = notification.type || "unknown";

      logger.info(
        `Processando webhook genérico do tipo ${notificationType}: ${resourceId}`
      );

      // Para webhooks genéricos, apenas logamos a recepção
      // Em uma implementação real, você poderia adicionar mais lógica aqui

      return {
        success: true,
        type: notificationType,
        resourceId,
        message: `Webhook do tipo ${notificationType} recebido com sucesso`,
        data: notification.data,
      };
    } catch (error) {
      logger.error(`Erro ao processar webhook genérico`, error);
      return {
        success: false,
        type: notification.type,
        resourceId: notification.data?.id,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        errorCode: "GENERIC_WEBHOOK_ERROR",
      };
    }
  }
}

// Exporta uma instância do controlador
export const webhookController = new WebhookController();
