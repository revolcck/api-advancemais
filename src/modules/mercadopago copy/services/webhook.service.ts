import { MercadoPagoBaseService } from "./base.service";
import {
  MercadoPagoIntegrationType,
  credentialsManager,
} from "../config/credentials";
import { logger } from "@/shared/utils/logger.utils";
import { IWebhookService } from "../interfaces";
import { paymentService } from "./payment.service";
import { subscriptionService } from "./subscription.service";
import { WebhookResponse } from "../dtos/mercadopago.dto";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { WebhookAdapter } from "../adapters/webhook.adapter";
import {
  WebhookTopicType,
  WebhookNotification,
  WebhookProcessResponse,
} from "../types/webhook-custom.types";

export class WebhookService
  extends MercadoPagoBaseService
  implements IWebhookService
{
  private webhookSecret: string;
  private webhookAdapter: WebhookAdapter;

  /**
   * Construtor do serviço de webhook
   * @param integrationType Tipo de integração
   */
  constructor(integrationType: MercadoPagoIntegrationType) {
    super(integrationType);

    // Inicializa o adaptador com o cliente
    const merchantOrderClient = this.createMerchantOrderClient();
    this.webhookAdapter = new WebhookAdapter(merchantOrderClient);

    // Obtém o accessToken do tipo de integração atual
    const credentials = credentialsManager.getCredentials(integrationType);

    // Usa o secret de webhook se configurado em variáveis de ambiente, ou cria um baseado no accessToken
    this.webhookSecret =
      process.env.MERCADOPAGO_WEBHOOK_SECRET ||
      credentials.accessToken.substring(0, 32);

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
    return this.webhookAdapter.verifySignature(
      payload,
      signature,
      this.webhookSecret
    );
  }

  /**
   * Processa uma notificação de webhook
   * @param notification Dados da notificação
   * @returns Resultado do processamento
   */
  public async processWebhook(notificationData: any): Promise<WebhookResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de webhook do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      // Normaliza a notificação para garantir estrutura consistente
      const notification =
        this.webhookAdapter.normalizeNotification(notificationData);

      logger.info("Processando webhook do MercadoPago", {
        type: notification.type,
        id: notification.id,
        dataId: notification.data?.id,
        integrationType: this.integrationType,
      });

      // Lógica de processamento baseada no tipo de notificação
      const result = await this.routeWebhookByType(notification);

      return {
        success: result.success,
        type: result.type,
        resourceId: result.resourceId,
        data: result.data,
        error: result.error,
        errorCode: result.errorCode,
      };
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
   * Encaminha o webhook para o processador apropriado com base no tipo
   * @param notification Notificação normalizada
   * @returns Resultado do processamento
   */
  private async routeWebhookByType(
    notification: WebhookNotification
  ): Promise<WebhookProcessResponse> {
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
  }

  /**
   * Processa webhook de pagamento
   * @param notification Notificação de pagamento
   * @returns Detalhes do pagamento atualizado
   */
  private async processPaymentWebhook(
    notification: WebhookNotification
  ): Promise<WebhookProcessResponse> {
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
    notification: WebhookNotification
  ): Promise<WebhookProcessResponse> {
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

      // Obtém os detalhes da ordem usando o adaptador
      const orderDetails = await this.webhookAdapter.getMerchantOrder(orderId);

      // Processa a ordem de mercador
      try {
        // 1. Verifica se a ordem tem pagamentos associados
        if (orderDetails.payments && orderDetails.payments.length > 0) {
          logger.info(
            `Ordem ${orderId} tem ${orderDetails.payments.length} pagamentos associados`
          );

          // 2. Verifica se há referência externa para associar a um pedido do sistema
          if (orderDetails.external_reference) {
            // Usando uma instância do prisma para consultar o pedido
            const prisma = require("@/shared/database/prisma").prismaClient;

            // 3. Tenta encontrar o pedido correspondente no banco de dados
            const order = await prisma.order.findUnique({
              where: {
                externalReference: orderDetails.external_reference,
              },
              include: {
                items: true,
                customer: true,
              },
            });

            // 4. Se encontrar o pedido, atualiza seu status
            if (order) {
              // Determina o status do pedido com base nos pagamentos
              const paymentStatuses = orderDetails.payments.map(
                (p) => p.status
              );

              // Se todos estiverem aprovados, marca pedido como pago
              const allApproved = paymentStatuses.every(
                (s) => s === "approved"
              );

              // Calcula o valor total pago
              const totalPaid = orderDetails.payments
                .filter((p) => p.status === "approved")
                .reduce((sum, p) => sum + (p.transaction_amount || 0), 0);

              // Atualiza o pedido
              await prisma.order.update({
                where: { id: order.id },
                data: {
                  status: allApproved ? "PAID" : "PROCESSING_PAYMENT",
                  paymentData: {
                    ...order.paymentData,
                    merchantOrderId: orderId,
                    paymentStatuses: paymentStatuses,
                    totalPaid: totalPaid,
                    lastUpdated: new Date().toISOString(),
                  },
                },
              });

              logger.info(
                `Pedido ${order.id} atualizado com base na ordem ${orderId}`
              );
            } else {
              logger.warn(
                `Pedido não encontrado para referência externa: ${orderDetails.external_reference}`
              );
            }
          }
        }

        // 5. Registra a ordem para fins de auditoria
        const AuditService =
          require("@/shared/services/audit.service").AuditService;
        AuditService.log(
          "merchant_order_received",
          "merchant_order",
          orderId.toString(),
          "webhook",
          {
            status: orderDetails.status,
            paymentCount: orderDetails.payments?.length || 0,
            itemCount: orderDetails.items?.length || 0,
            externalReference: orderDetails.external_reference,
          }
        );
      } catch (processingError) {
        // Registra o erro mas continua com sucesso para evitar reenvios
        logger.error(
          `Erro ao processar lógica de negócios da ordem ${orderId}`,
          processingError
        );
      }

      logger.info(`Webhook de merchant order processado com sucesso`, {
        orderId,
        status: orderDetails.status,
        integrationType: this.integrationType,
      });

      return {
        success: true,
        type: notification.type,
        resourceId: orderId.toString(),
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
    notification: WebhookNotification
  ): Promise<WebhookProcessResponse> {
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
    notification: WebhookNotification
  ): Promise<WebhookProcessResponse> {
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

      // Implementação de processamento de fatura (invoice)
      try {
        // 1. Obtém os dados da fatura da API do MercadoPago
        // Nota: Como não há um método direto para faturas no SDK, usamos a API HTTP
        const axios = require("axios");
        const credentials = credentialsManager.getCredentials(
          this.integrationType
        );

        const invoiceResponse = await axios.get(
          `https://api.mercadopago.com/v1/invoices/${invoiceId}`,
          {
            headers: {
              Authorization: `Bearer ${credentials.accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        const invoiceData = invoiceResponse.data;

        // 2. Determina o status da fatura
        const invoiceStatus = invoiceData.status;
        const subscriptionId = invoiceData.subscription_id;

        logger.info(
          `Fatura ${invoiceId} está com status ${invoiceStatus}, assinatura: ${subscriptionId}`
        );

        // 3. Atualiza o sistema com base no status da fatura
        const prisma = require("@/shared/database/prisma").prismaClient;

        // 3.1 Verifica se a assinatura existe no sistema
        const subscription = await prisma.subscription.findFirst({
          where: {
            externalId: subscriptionId,
          },
          include: {
            customer: true,
          },
        });

        if (subscription) {
          // 3.2 Registra a fatura no sistema
          await prisma.subscriptionInvoice.upsert({
            where: {
              externalId: invoiceId,
            },
            update: {
              status: invoiceStatus,
              amount: invoiceData.transaction_amount,
              dueDate: new Date(invoiceData.date_due),
              paymentDate: invoiceData.date_approved
                ? new Date(invoiceData.date_approved)
                : null,
              lastUpdate: new Date(),
            },
            create: {
              externalId: invoiceId,
              subscriptionId: subscription.id,
              status: invoiceStatus,
              amount: invoiceData.transaction_amount,
              dueDate: new Date(invoiceData.date_due),
              paymentDate: invoiceData.date_approved
                ? new Date(invoiceData.date_approved)
                : null,
              invoiceNumber: invoiceData.invoice_number || `INV-${invoiceId}`,
              description: `Fatura da assinatura ${subscriptionId}`,
              customerId: subscription.customerId,
            },
          });

          // 3.3 Notifica o cliente sobre a fatura, se configurado
          if (subscription.customer?.email && invoiceStatus === "paid") {
            try {
              const notificationService =
                require("@/modules/notification/services/notification.service").notificationService;

              await notificationService.sendInvoiceNotification({
                email: subscription.customer.email,
                invoiceId: invoiceId,
                amount: invoiceData.transaction_amount,
                status: invoiceStatus,
                subscriptionName: subscription.name || "Assinatura",
                paymentDate: invoiceData.date_approved,
              });

              logger.info(
                `Notificação de fatura enviada para ${subscription.customer.email}`
              );
            } catch (notifyError) {
              logger.error(`Erro ao enviar notificação de fatura`, notifyError);
            }
          }
        } else {
          logger.warn(
            `Assinatura ${subscriptionId} não encontrada para fatura ${invoiceId}`
          );
        }

        // 4. Registra a fatura para fins de auditoria
        const AuditService =
          require("@/shared/services/audit.service").AuditService;
        AuditService.log("invoice_received", "invoice", invoiceId, "webhook", {
          status: invoiceStatus,
          subscriptionId: subscriptionId,
          amount: invoiceData.transaction_amount,
        });
      } catch (processingError) {
        // Registra o erro mas continua com sucesso para evitar reenvios
        logger.error(
          `Erro ao processar lógica de negócios da fatura ${invoiceId}`,
          processingError
        );
      }

      logger.info(`Webhook de fatura processado com sucesso`, {
        invoiceId,
        integrationType: this.integrationType,
      });

      return {
        success: true,
        type: notification.type,
        resourceId: invoiceId,
        message: `Notificação de fatura ${invoiceId} processada com sucesso`,
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

// Reexportamos o enum para compatibilidade com código existente
export { WebhookTopicType } from "../types/webhook-custom.types";
