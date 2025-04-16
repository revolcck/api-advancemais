/**
 * Serviço para processamento de webhooks de assinatura
 * @module modules/subscription/services/webhook.service
 */

import { prisma } from "@/config/database";
import { logger } from "@/shared/utils/logger.utils";
import { WebhookEventType } from "@/modules/mercadopago/types/events.types";
import { PaymentStatus, SubscriptionStatus } from "@prisma/client";
import {
  ISubscriptionWebhookProcessor,
  ISubscriptionWebhookService,
  IWebhookProcessResult,
} from "../interfaces/webhook.interface";
import { subscriptionService } from "./subscription.service";
import {
  getSubscriptionAdapter,
  getPaymentAdapter,
  getMerchantOrderAdapter,
  MercadoPagoIntegrationType,
} from "@/modules/mercadopago";

/**
 * Implementação do serviço de webhooks de assinatura
 */
export class SubscriptionWebhookService
  implements ISubscriptionWebhookService, ISubscriptionWebhookProcessor
{
  /**
   * Processa um evento de webhook
   * @param eventType Tipo de evento
   * @param data Dados do evento
   * @param id ID do evento
   * @returns Resultado do processamento
   */
  public async processEvent(
    eventType: WebhookEventType,
    data: Record<string, any>,
    id?: string
  ): Promise<IWebhookProcessResult> {
    try {
      // Registra o evento
      logger.info(`Processando evento de webhook: ${eventType}`, {
        eventType,
        id,
        data,
      });

      // Log do evento recebido
      await this.logWebhookEvent(eventType, id, data);

      // Direciona para o processador específico
      switch (eventType) {
        case WebhookEventType.SUBSCRIPTION:
          return this.processSubscriptionEvent(
            data.id,
            data.action || "updated",
            data
          );

        case WebhookEventType.PAYMENT:
          return this.processPaymentEvent(
            data.id,
            data.action || "updated",
            data
          );

        case WebhookEventType.PLAN:
          return this.processPlanEvent(data.id, data.action || "updated", data);

        case WebhookEventType.MERCHANT_ORDER:
          return this.processMerchantOrderEvent(
            data.id,
            data.action || "updated",
            data
          );

        default:
          logger.warn(`Tipo de evento não suportado: ${eventType}`, { data });
          return {
            success: false,
            message: `Tipo de evento não suportado: ${eventType}`,
            error: "UNSUPPORTED_EVENT_TYPE",
            errorCode: "WEBHOOK_UNSUPPORTED_EVENT",
          };
      }
    } catch (error) {
      logger.error(`Erro ao processar evento de webhook ${eventType}:`, error);

      return {
        success: false,
        message: `Erro ao processar evento: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        errorCode: "WEBHOOK_PROCESSING_ERROR",
      };
    }
  }

  /**
   * Processa um evento de assinatura
   * @param id ID da assinatura
   * @param action Ação realizada
   * @param data Dados do evento
   * @returns Resultado do processamento
   */
  public async processSubscriptionEvent(
    id: string,
    action: string,
    data: Record<string, any>
  ): Promise<IWebhookProcessResult> {
    try {
      // Busca a assinatura no banco de dados
      const subscription = await prisma.subscription.findFirst({
        where: { mpSubscriptionId: id },
      });

      // Se não encontrou a assinatura, registra o evento e retorna
      if (!subscription) {
        logger.warn(
          `Assinatura não encontrada para o ID do MercadoPago: ${id}`,
          { data }
        );

        return {
          success: true,
          message: "Assinatura recebida, mas não encontrada no sistema",
          action,
          subscriptionId: id,
          status: data.status,
        };
      }

      // Determina o novo status com base na ação/status recebido
      let newStatus: SubscriptionStatus | undefined;
      let isPaused: boolean | undefined;
      let canceledAt: Date | undefined;
      let pausedAt: Date | undefined;

      // Processa de acordo com a ação/status
      switch (data.status) {
        case "authorized":
          newStatus = SubscriptionStatus.ACTIVE;
          isPaused = false;
          break;

        case "paused":
          isPaused = true;
          pausedAt = new Date();
          break;

        case "cancelled":
          newStatus = SubscriptionStatus.CANCELED;
          canceledAt = new Date();
          break;

        case "pending":
          newStatus = SubscriptionStatus.PENDING;
          break;
      }

      // Atualiza a assinatura se houver mudanças
      if (newStatus || isPaused !== undefined) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            ...(newStatus !== undefined && { status: newStatus }),
            ...(isPaused !== undefined && { isPaused }),
            ...(canceledAt && { canceledAt }),
            ...(pausedAt && { pausedAt }),
            ...(data.next_payment_date && {
              nextBillingDate: new Date(data.next_payment_date),
            }),
          },
        });

        logger.info(`Assinatura atualizada: ${subscription.id}`, {
          subscriptionId: subscription.id,
          mpSubscriptionId: id,
          action,
          newStatus,
          isPaused,
        });
      }

      return {
        success: true,
        message: `Assinatura processada: ${action}`,
        action,
        subscriptionId: subscription.id,
        status: newStatus || subscription.status,
      };
    } catch (error) {
      logger.error(`Erro ao processar evento de assinatura ${id}:`, error);

      return {
        success: false,
        message: `Erro ao processar assinatura: ${
          error instanceof Error ? error.message : String(error)
        }`,
        action,
        subscriptionId: id,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        errorCode: "SUBSCRIPTION_PROCESSING_ERROR",
      };
    }
  }

  /**
   * Processa um evento de pagamento
   * @param id ID do pagamento
   * @param action Ação realizada
   * @param data Dados do evento
   * @returns Resultado do processamento
   */
  public async processPaymentEvent(
    id: string,
    action: string,
    data: Record<string, any>
  ): Promise<IWebhookProcessResult> {
    try {
      // Verifica se já temos esse pagamento registrado
      const existingPayment = await prisma.payment.findFirst({
        where: { mpPaymentId: id },
      });

      // Determina o status do pagamento
      let paymentStatus: PaymentStatus;

      switch (data.status) {
        case "approved":
          paymentStatus = PaymentStatus.APPROVED;
          break;
        case "rejected":
        case "cancelled":
          paymentStatus = PaymentStatus.REJECTED;
          break;
        case "in_process":
          paymentStatus = PaymentStatus.IN_PROCESS;
          break;
        case "refunded":
          paymentStatus = PaymentStatus.REFUNDED;
          break;
        case "charged_back":
          paymentStatus = PaymentStatus.CHARGED_BACK;
          break;
        default:
          paymentStatus = PaymentStatus.PENDING;
      }

      // Se já existe o pagamento, só atualiza o status
      if (existingPayment) {
        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: paymentStatus,
            mpStatus: data.status,
            mpStatusDetail:
              data.status_detail || existingPayment.mpStatusDetail,
            gatewayResponse: data as any,
          },
        });

        logger.info(`Pagamento atualizado: ${existingPayment.id}`, {
          paymentId: existingPayment.id,
          mpPaymentId: id,
          status: paymentStatus,
          action,
        });

        // Se foi aprovado, atualiza o status da assinatura
        if (
          paymentStatus === PaymentStatus.APPROVED &&
          existingPayment.subscriptionId
        ) {
          await prisma.subscription.update({
            where: { id: existingPayment.subscriptionId },
            data: {
              status: SubscriptionStatus.ACTIVE,
              renewalFailures: 0,
            },
          });
        }

        return {
          success: true,
          message: `Pagamento atualizado: ${action}`,
          action,
          paymentId: existingPayment.id,
          status: paymentStatus,
        };
      }

      // Se não existe, precisamos buscar mais detalhes e criar o pagamento
      try {
        // Busca detalhes do pagamento no MercadoPago
        const paymentAdapter = getPaymentAdapter(
          MercadoPagoIntegrationType.SUBSCRIPTION
        );
        const paymentDetails = await paymentAdapter.get(id);

        // Busca a assinatura relacionada a este pagamento
        let subscriptionId: string | null = null;

        if (paymentDetails.external_reference) {
          const subscription = await prisma.subscription.findFirst({
            where: {
              OR: [
                { id: paymentDetails.external_reference },
                { mpSubscriptionId: paymentDetails.external_reference },
              ],
            },
          });

          if (subscription) {
            subscriptionId = subscription.id;
          }
        }

        // Se não encontrou por external_reference, tenta por outros meios
        if (
          !subscriptionId &&
          paymentDetails.metadata &&
          paymentDetails.metadata.subscription_id
        ) {
          subscriptionId = paymentDetails.metadata.subscription_id;
        }

        // Se ainda não encontrou, verifica se há ordem de mercador (merchant_order)
        if (
          !subscriptionId &&
          paymentDetails.order &&
          paymentDetails.order.id
        ) {
          try {
            const merchantOrderAdapter = getMerchantOrderAdapter(
              MercadoPagoIntegrationType.SUBSCRIPTION
            );
            const order = await merchantOrderAdapter.get(
              paymentDetails.order.id
            );

            if (order.external_reference) {
              const subscription = await prisma.subscription.findFirst({
                where: {
                  OR: [
                    { id: order.external_reference },
                    { mpSubscriptionId: order.external_reference },
                  ],
                },
              });

              if (subscription) {
                subscriptionId = subscription.id;
              }
            }
          } catch (orderError) {
            logger.error(
              `Erro ao buscar ordem de mercador: ${paymentDetails.order.id}`,
              orderError
            );
          }
        }

        // Se não encontrou a assinatura relacionada, registra o evento e retorna
        if (!subscriptionId) {
          logger.warn(
            `Não foi possível determinar a assinatura para o pagamento: ${id}`,
            { paymentDetails }
          );

          return {
            success: true,
            message:
              "Pagamento recebido, mas não foi possível vinculá-lo a uma assinatura",
            action,
            paymentId: id,
            status: data.status,
          };
        }

        // Cria o pagamento no sistema
        const amount = paymentDetails.transaction_amount || 0;
        const payment = await subscriptionService.processPayment({
          subscriptionId,
          amount,
          status: paymentStatus,
          description: `Pagamento via MercadoPago - ${id}`,
          paymentDate: new Date(paymentDetails.date_created),
          mpPaymentId: id,
          mpExternalReference: paymentDetails.external_reference,
          mpStatus: data.status,
          mpStatusDetail: data.status_detail,
          mpPaymentMethodId: paymentDetails.payment_method_id,
          mpPaymentTypeId: paymentDetails.payment_type_id,
          gatewayResponse: paymentDetails,
        });

        logger.info(`Novo pagamento processado: ${payment.id}`, {
          paymentId: payment.id,
          mpPaymentId: id,
          subscriptionId,
          status: paymentStatus,
          amount,
        });

        // Se foi aprovado, atualiza o status da assinatura
        if (paymentStatus === PaymentStatus.APPROVED) {
          await prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
              status: SubscriptionStatus.ACTIVE,
              renewalFailures: 0,
            },
          });
        }

        return {
          success: true,
          message: `Novo pagamento registrado: ${action}`,
          action,
          paymentId: payment.id,
          subscriptionId,
          status: paymentStatus,
        };
      } catch (apiError) {
        logger.error(
          `Erro ao obter detalhes do pagamento ${id} do MercadoPago:`,
          apiError
        );

        return {
          success: false,
          message: `Erro ao obter detalhes do pagamento: ${
            apiError instanceof Error ? apiError.message : String(apiError)
          }`,
          action,
          paymentId: id,
          error:
            apiError instanceof Error ? apiError.message : "Erro desconhecido",
          errorCode: "PAYMENT_FETCH_ERROR",
        };
      }
    } catch (error) {
      logger.error(`Erro ao processar evento de pagamento ${id}:`, error);

      return {
        success: false,
        message: `Erro ao processar pagamento: ${
          error instanceof Error ? error.message : String(error)
        }`,
        action,
        paymentId: id,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        errorCode: "PAYMENT_PROCESSING_ERROR",
      };
    }
  }

  /**
   * Processa um evento de plano
   * @param id ID do plano
   * @param action Ação realizada
   * @param data Dados do evento
   * @returns Resultado do processamento
   */
  public async processPlanEvent(
    id: string,
    action: string,
    data: Record<string, any>
  ): Promise<IWebhookProcessResult> {
    // Por enquanto apenas registramos o evento, sem processamento específico
    logger.info(`Evento de plano recebido: ${action}`, { planId: id, data });

    return {
      success: true,
      message: `Evento de plano registrado: ${action}`,
      action,
      data,
    };
  }

  /**
   * Processa um evento de ordem (merchant order)
   * @param id ID da ordem
   * @param action Ação realizada
   * @param data Dados do evento
   * @returns Resultado do processamento
   */
  public async processMerchantOrderEvent(
    id: string,
    action: string,
    data: Record<string, any>
  ): Promise<IWebhookProcessResult> {
    try {
      // Busca detalhes da ordem no MercadoPago
      const merchantOrderAdapter = getMerchantOrderAdapter(
        MercadoPagoIntegrationType.SUBSCRIPTION
      );
      const orderDetails = await merchantOrderAdapter.get(id);

      // Se tiver referência externa, pode ser um ID de assinatura
      if (orderDetails.external_reference) {
        const subscription = await prisma.subscription.findFirst({
          where: {
            OR: [
              { id: orderDetails.external_reference },
              { mpSubscriptionId: orderDetails.external_reference },
            ],
          },
        });

        if (subscription) {
          // Atualiza a assinatura com o ID da ordem
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { mpMerchantOrderId: String(id) },
          });

          logger.info(
            `Ordem de mercador vinculada à assinatura: ${subscription.id}`,
            {
              subscriptionId: subscription.id,
              merchantOrderId: id,
            }
          );

          return {
            success: true,
            message: `Ordem de mercador vinculada à assinatura: ${action}`,
            action,
            subscriptionId: subscription.id,
          };
        }
      }

      // Se não encontrou uma assinatura, apenas registra para fins de auditoria
      logger.info(`Evento de ordem de mercador recebido: ${action}`, {
        merchantOrderId: id,
        externalReference: orderDetails.external_reference,
        status: orderDetails.status,
      });

      return {
        success: true,
        message: `Evento de ordem de mercador registrado: ${action}`,
        action,
        data: {
          merchantOrderId: id,
          externalReference: orderDetails.external_reference,
          status: orderDetails.status,
        },
      };
    } catch (error) {
      logger.error(
        `Erro ao processar evento de ordem de mercador ${id}:`,
        error
      );

      return {
        success: false,
        message: `Erro ao processar ordem de mercador: ${
          error instanceof Error ? error.message : String(error)
        }`,
        action,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        errorCode: "MERCHANT_ORDER_PROCESSING_ERROR",
      };
    }
  }

  /**
   * Registra um evento de webhook no banco de dados
   * @param eventType Tipo de evento
   * @param eventId ID do evento
   * @param data Dados do evento
   */
  private async logWebhookEvent(
    eventType: string,
    eventId: string | undefined,
    data: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.webhookNotification.create({
        data: {
          source: "mercadopago",
          eventType,
          eventId: eventId || `${eventType}_${Date.now()}`,
          rawData: data as any,
          processStatus: "pending",
          liveMode: data.live_mode !== false,
        },
      });
    } catch (error) {
      logger.error("Erro ao registrar evento de webhook:", error);
    }
  }
}

// Instância do serviço para exportação
export const webhookService = new SubscriptionWebhookService();
