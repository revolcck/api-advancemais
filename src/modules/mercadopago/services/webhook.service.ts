/**
 * Serviço para processamento de webhooks do MercadoPago
 * @module modules/mercadopago/services/webhook.service
 */

import { createHmac } from "crypto";
import { MercadoPagoBaseService } from "./base.service";
import { MercadoPagoIntegrationType } from "../config/credentials";
import { logger } from "@/shared/utils/logger.utils";
import { IWebhookService } from "../interfaces";
import { paymentService } from "./payment.service";
import { subscriptionService } from "./subscription.service";
import {
  WebhookNotificationRequest,
  WebhookResponse,
} from "../dtos/mercadopago.dto";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { env } from "@/config/environment";

/**
 * Tipos de notificação do MercadoPago
 */
export enum WebhookTopicType {
  PAYMENT = "payment",
  MERCHANT_ORDER = "merchant_order",
  PLAN = "plan",
  SUBSCRIPTION = "subscription",
  INVOICE = "invoice",
  POINT_INTEGRATION_WIRED = "point_integration_wired",
}

/**
 * Serviço para processamento de webhooks do MercadoPago
 * Implementa a interface IWebhookService
 */
export class WebhookService
  extends MercadoPagoBaseService
  implements IWebhookService
{
  private webhookSecret: string;

  /**
   * Construtor do serviço de webhook
   * @param integrationType Tipo de integração
   */
  constructor(integrationType: MercadoPagoIntegrationType) {
    super(integrationType);

    // Usa a variável de ambiente ou um fallback para a chave secreta
    this.webhookSecret =
      process.env.MERCADOPAGO_WEBHOOK_SECRET ||
      this.accessToken.substring(0, 32);

    logger.debug("Serviço de webhook do MercadoPago inicializado", {
      integrationType,
    });
  }

  /**
   * Verifica a assinatura do webhook para garantir autenticidade
   * @param payload Conteúdo do webhook
   * @param signature Assinatura recebida no cabeçalho
   * @returns Verdadeiro se a assinatura for válida
   */
  public verifySignature(payload: string, signature: string): boolean {
    try {
      // Implementação baseada na documentação do MercadoPago
      const expectedSignature = createHmac("sha256", this.webhookSecret)
        .update(payload)
        .digest("hex");

      const isValid = signature === expectedSignature;

      if (!isValid) {
        logger.warn("Assinatura de webhook inválida", {
          integrationType: this.integrationType,
          receivedSignature: signature.substring(0, 10) + "...",
        });
      }

      return isValid;
    } catch (error) {
      logger.error("Erro ao verificar assinatura de webhook", error);
      return false;
    }
  }

  /**
   * Processa uma notificação de webhook
   * @param notification Dados da notificação
   * @returns Resultado do processamento
   */
  public async processWebhook(
    notification: WebhookNotificationRequest
  ): Promise<WebhookResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de webhook do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      logger.info("Processando webhook do MercadoPago", {
        type: notification.type,
        id: notification.id,
        dataId: notification.data?.id,
        integrationType: this.integrationType,
      });

      // Lógica de processamento baseada no tipo de notificação
      switch (notification.type) {
        case WebhookTopicType.PAYMENT:
          return await this.processPaymentWebhook(notification);

        case WebhookTopicType.MERCHANT_ORDER:
          return await this.processMerchantOrderWebhook(notification);

        case WebhookTopicType.SUBSCRIPTION:
        case WebhookTopicType.PLAN:
          return await this.processSubscriptionWebhook(notification);

        case WebhookTopicType.INVOICE:
          return await this.processInvoiceWebhook(notification);

        default:
          logger.warn(`Tipo de webhook não suportado: ${notification.type}`, {
            integrationType: this.integrationType,
          });
          return {
            success: false,
            type: notification.type,
            error: `Tipo de notificação não suportado: ${notification.type}`,
            errorCode: "WEBHOOK_UNSUPPORTED_TYPE",
          };
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        return {
          success: false,
          error: error.message,
          errorCode: error.errorCode,
        };
      }

      // Para evitar reenvios por parte do MercadoPago, capturamos e logamos qualquer erro
      logger.error("Erro ao processar webhook", error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Erro ao processar webhook",
        errorCode: "WEBHOOK_PROCESSING_ERROR",
      };
    }
  }

  /**
   * Processa webhook de pagamento
   * @param notification Notificação de pagamento
   * @returns Detalhes do pagamento atualizado
   */
  private async processPaymentWebhook(
    notification: WebhookNotificationRequest
  ): Promise<WebhookResponse> {
    try {
      if (!notification.data?.id) {
        return {
          success: false,
          type: notification.type,
          error: "ID do pagamento não fornecido na notificação",
          errorCode: "WEBHOOK_MISSING_PAYMENT_ID",
        };
      }

      const paymentId = notification.data.id;
      logger.info(`Processando webhook de pagamento ID: ${paymentId}`, {
        integrationType: this.integrationType,
      });

      // Delega o processamento para o serviço de pagamento
      const result = await paymentService.processPaymentWebhook(
        paymentId,
        notification.type
      );

      return {
        success: result.success,
        type: notification.type,
        resourceId: paymentId,
        data: result.data,
        error: result.error,
        errorCode: result.errorCode,
      };
    } catch (error) {
      logger.error("Erro ao processar webhook de pagamento", error);
      return {
        success: false,
        type: notification.type,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar webhook de pagamento",
        errorCode: "WEBHOOK_PAYMENT_PROCESSING_ERROR",
      };
    }
  }

  /**
   * Processa webhook de merchant order
   * @param notification Notificação de ordem
   * @returns Detalhes da ordem atualizada
   */
  private async processMerchantOrderWebhook(
    notification: WebhookNotificationRequest
  ): Promise<WebhookResponse> {
    try {
      if (!notification.data?.id) {
        return {
          success: false,
          type: notification.type,
          error: "ID da ordem não fornecido na notificação",
          errorCode: "WEBHOOK_MISSING_ORDER_ID",
        };
      }

      const orderId = notification.data.id;
      logger.info(`Processando webhook de merchant order ID: ${orderId}`, {
        integrationType: this.integrationType,
      });

      // Obtém os detalhes da ordem
      const merchantOrderClient = this.createMerchantOrderClient();
      const orderDetails = await merchantOrderClient.get({ id: orderId });

      // Aqui você implementaria a lógica para processar a ordem
      // Por exemplo, atualizar status de pedidos, processar pagamentos associados, etc.

      logger.info(`Webhook de merchant order processado com sucesso`, {
        orderId,
        status: orderDetails.status,
        integrationType: this.integrationType,
      });

      return {
        success: true,
        type: notification.type,
        resourceId: orderId,
        data: orderDetails,
      };
    } catch (error) {
      logger.error("Erro ao processar webhook de merchant order", error);
      return {
        success: false,
        type: notification.type,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar webhook de merchant order",
        errorCode: "WEBHOOK_ORDER_PROCESSING_ERROR",
      };
    }
  }

  /**
   * Processa webhook de assinatura
   * @param notification Notificação de assinatura
   * @returns Detalhes da assinatura atualizada
   */
  private async processSubscriptionWebhook(
    notification: WebhookNotificationRequest
  ): Promise<WebhookResponse> {
    try {
      if (!notification.data?.id) {
        return {
          success: false,
          type: notification.type,
          error: "ID da assinatura não fornecido na notificação",
          errorCode: "WEBHOOK_MISSING_SUBSCRIPTION_ID",
        };
      }

      const subscriptionId = notification.data.id;
      logger.info(`Processando webhook de assinatura ID: ${subscriptionId}`, {
        integrationType: this.integrationType,
        type: notification.type,
      });

      // Delega o processamento para o serviço de assinatura
      const result = await subscriptionService.processSubscriptionWebhook(
        subscriptionId,
        notification.type
      );

      return {
        success: result.success,
        type: notification.type,
        resourceId: subscriptionId,
        data: result.data,
        error: result.error,
        errorCode: result.errorCode,
      };
    } catch (error) {
      logger.error("Erro ao processar webhook de assinatura", error);
      return {
        success: false,
        type: notification.type,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar webhook de assinatura",
        errorCode: "WEBHOOK_SUBSCRIPTION_PROCESSING_ERROR",
      };
    }
  }

  /**
   * Processa webhook de fatura
   * @param notification Notificação de fatura
   * @returns Detalhes da fatura
   */
  private async processInvoiceWebhook(
    notification: WebhookNotificationRequest
  ): Promise<WebhookResponse> {
    try {
      if (!notification.data?.id) {
        return {
          success: false,
          type: notification.type,
          error: "ID da fatura não fornecido na notificação",
          errorCode: "WEBHOOK_MISSING_INVOICE_ID",
        };
      }

      const invoiceId = notification.data.id;
      logger.info(`Processando webhook de fatura ID: ${invoiceId}`, {
        integrationType: this.integrationType,
      });

      // Neste momento, apenas logamos que recebemos a notificação
      // Você pode adicionar lógica para processar a fatura conforme necessário
      logger.info(`Webhook de fatura recebido com sucesso`, {
        invoiceId,
        integrationType: this.integrationType,
      });

      return {
        success: true,
        type: notification.type,
        resourceId: invoiceId,
        message: `Notificação de fatura ${invoiceId} recebida`,
      };
    } catch (error) {
      logger.error("Erro ao processar webhook de fatura", error);
      return {
        success: false,
        type: notification.type,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar webhook de fatura",
        errorCode: "WEBHOOK_INVOICE_PROCESSING_ERROR",
      };
    }
  }
}

// Exporta instâncias para os dois tipos de integração
export const checkoutWebhookService = new WebhookService(
  MercadoPagoIntegrationType.CHECKOUT
);

export const subscriptionWebhookService = new WebhookService(
  MercadoPagoIntegrationType.SUBSCRIPTION
);
