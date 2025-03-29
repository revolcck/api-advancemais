/**
 * Serviço para processamento de webhooks do MercadoPago
 * @module modules/mercadopago/services/webhook.service
 */

import {
  credentialsManager,
  MercadoPagoIntegrationType,
} from "../config/credentials";
import { logger } from "@/shared/utils/logger.utils";
import { MercadoPagoBaseService } from "./base.service";
import { paymentService } from "./payment.service";
import { subscriptionService } from "./subscription.service";
import { createHash, createHmac } from "crypto";

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
 * Interface para notificação webhook
 */
export interface WebhookNotification {
  id: string;
  type: WebhookTopicType;
  data: {
    id: string;
    [key: string]: any;
  };
  user_id?: string;
  live_mode: boolean;
  api_version?: string;
  date_created: string;
  application_id?: string;
}

/**
 * Serviço para processamento de webhooks
 */
export class WebhookService extends MercadoPagoBaseService {
  private webhookSecret: string;

  /**
   * Construtor do serviço de webhook
   * @param integrationType Tipo de integração
   */
  constructor(integrationType: MercadoPagoIntegrationType) {
    super(integrationType);
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
      // Implementação exemplo - adaptar conforme documentação da API v2.3
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
  public async processWebhook(notification: WebhookNotification): Promise<any> {
    try {
      logger.info("Processando webhook do MercadoPago", {
        type: notification.type,
        id: notification.id,
        dataId: notification.data.id,
        integrationType: this.integrationType,
      });

      // Lógica de processamento baseada no tipo de notificação
      switch (notification.type) {
        case WebhookTopicType.PAYMENT:
          return await this.processPaymentWebhook(notification.data.id);

        case WebhookTopicType.MERCHANT_ORDER:
          return await this.processMerchantOrderWebhook(notification.data.id);

        case WebhookTopicType.SUBSCRIPTION:
          return await this.processSubscriptionWebhook(notification.data.id);

        case WebhookTopicType.INVOICE:
          return await this.processInvoiceWebhook(notification.data.id);

        default:
          logger.warn(`Tipo de webhook não suportado: ${notification.type}`, {
            integrationType: this.integrationType,
          });
          return {
            status: "ignored",
            message: `Tipo de notificação não suportado: ${notification.type}`,
          };
      }
    } catch (error) {
      logger.error("Erro ao processar webhook", error);
      throw error;
    }
  }

  /**
   * Processa webhook de pagamento
   * @param paymentId ID do pagamento
   * @returns Detalhes do pagamento atualizado
   */
  private async processPaymentWebhook(paymentId: string): Promise<any> {
    try {
      logger.info(`Processando webhook de pagamento ID: ${paymentId}`, {
        integrationType: this.integrationType,
      });

      // Obtém os detalhes do pagamento
      const paymentDetails = await paymentService.getPayment(paymentId);

      // Aqui você adicionaria a lógica para atualizar seu sistema com os novos dados
      // Por exemplo, atualizar o status do pedido na sua base de dados

      logger.info(`Webhook de pagamento processado com sucesso`, {
        paymentId,
        status: paymentDetails.status,
        integrationType: this.integrationType,
      });

      return {
        success: true,
        data: paymentDetails,
      };
    } catch (error) {
      this.handleError(error, "processPaymentWebhook");
    }
  }

  /**
   * Processa webhook de merchant order
   * @param orderId ID da ordem
   * @returns Detalhes da ordem atualizada
   */
  private async processMerchantOrderWebhook(orderId: string): Promise<any> {
    try {
      logger.info(`Processando webhook de merchant order ID: ${orderId}`, {
        integrationType: this.integrationType,
      });

      // Obtém os detalhes da ordem
      const merchantOrderClient = this.createMerchantOrderClient();
      const orderDetails = await merchantOrderClient.get({ id: orderId });

      // Aqui você adicionaria a lógica para atualizar seu sistema com os novos dados

      logger.info(`Webhook de merchant order processado com sucesso`, {
        orderId,
        status: orderDetails.status,
        integrationType: this.integrationType,
      });

      return {
        success: true,
        data: orderDetails,
      };
    } catch (error) {
      this.handleError(error, "processMerchantOrderWebhook");
    }
  }

  /**
   * Processa webhook de assinatura
   * @param subscriptionId ID da assinatura
   * @returns Detalhes da assinatura atualizada
   */
  private async processSubscriptionWebhook(
    subscriptionId: string
  ): Promise<any> {
    try {
      logger.info(`Processando webhook de assinatura ID: ${subscriptionId}`, {
        integrationType: this.integrationType,
      });

      // Obtém os detalhes da assinatura
      const subscriptionDetails = await subscriptionService.getSubscription(
        subscriptionId
      );

      // Aqui você adicionaria a lógica para atualizar seu sistema com os novos dados

      logger.info(`Webhook de assinatura processado com sucesso`, {
        subscriptionId,
        status: subscriptionDetails.status,
        integrationType: this.integrationType,
      });

      return {
        success: true,
        data: subscriptionDetails,
      };
    } catch (error) {
      this.handleError(error, "processSubscriptionWebhook");
    }
  }

  /**
   * Processa webhook de fatura
   * @param invoiceId ID da fatura
   * @returns Detalhes da fatura
   */
  private async processInvoiceWebhook(invoiceId: string): Promise<any> {
    try {
      logger.info(`Processando webhook de fatura ID: ${invoiceId}`, {
        integrationType: this.integrationType,
      });

      // Lógica para processar notificações de fatura
      // Normalmente está relacionado a assinaturas

      logger.info(`Webhook de fatura processado com sucesso`, {
        invoiceId,
        integrationType: this.integrationType,
      });

      return {
        success: true,
        message: `Fatura ${invoiceId} processada com sucesso`,
      };
    } catch (error) {
      this.handleError(error, "processInvoiceWebhook");
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
