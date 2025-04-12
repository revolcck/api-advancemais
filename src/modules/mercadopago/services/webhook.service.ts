/**
 * Serviço para processamento de webhooks do MercadoPago
 * @module modules/mercadopago/services/webhook.service
 */

import { logger } from "@/shared/utils/logger.utils";
import { IWebhookProcessor } from "../interfaces/common.interface";
import {
  WebhookNotification,
  WebhookProcessResponse,
} from "../types/common.types";
import {
  WebhookEventType,
  WebhookEvent,
  PaymentWebhookEvent,
  SubscriptionWebhookEvent,
  MerchantOrderWebhookEvent,
} from "../types/events.types";
import { MercadoPagoIntegrationType } from "../enums";
import {
  webhookSchema,
  paymentWebhookSchema,
  subscriptionWebhookSchema,
  merchantOrderWebhookSchema,
} from "../validators/webhook.validators";
import { mercadoPagoCoreService } from "./core.service";
import { prisma } from "@/config/database";
import { WebhookValidator } from "../utils/webhook-validator.util";
import { mercadoPagoConfig } from "../config/mercadopago.config";

/**
 * Serviço para processamento de webhooks do MercadoPago
 * Implementa a lógica necessária para processar diferentes tipos de notificações
 */
export class WebhookService implements IWebhookProcessor {
  /**
   * Processa um webhook recebido do MercadoPago
   * @param notification Dados da notificação recebida
   * @returns Resultado do processamento
   */
  public async processWebhook(
    notification: WebhookNotification
  ): Promise<WebhookProcessResponse> {
    try {
      // Normaliza o tipo de evento
      const eventType = WebhookValidator.normalizeEventType(notification.type);

      // Define o tipo de integração (se não fornecido)
      if (!notification.integrationType) {
        notification.integrationType =
          WebhookValidator.getIntegrationTypeFromEvent(eventType);
      }

      // CORREÇÃO: Verifica se é um webhook de teste
      const isTestMode = mercadoPagoConfig.isTestMode(
        notification.integrationType
      );
      const isTestWebhook = WebhookValidator.isTestWebhook(notification);

      if (isTestWebhook) {
        logger.debug("Webhook de teste detectado", { eventType });
      }

      // Registra o recebimento do webhook
      await this.logWebhookReceived(notification);

      // Valida o formato do webhook
      const { isValid, error } = this.validateWebhook(notification, eventType);

      if (!isValid) {
        logger.warn(`Webhook inválido: ${error}`, {
          notification,
          eventType,
        });

        // CORREÇÃO: Para webhooks de teste, tratamos com mais flexibilidade
        if (isTestMode || isTestWebhook) {
          logger.debug("Aceitando webhook de teste mesmo com formato inválido");

          return {
            success: true,
            type: eventType,
            resourceId: notification.data?.id,
            message: "Webhook de teste processado, apesar de formato inválido",
          };
        }

        return {
          success: false,
          type: eventType,
          resourceId: notification.data?.id,
          error: `Formato de webhook inválido: ${error}`,
          errorCode: "INVALID_WEBHOOK_FORMAT",
        };
      }

      // Processa o webhook de acordo com o tipo
      switch (eventType) {
        case WebhookEventType.PAYMENT:
          return this.processPaymentWebhook(
            notification as PaymentWebhookEvent
          );

        case WebhookEventType.SUBSCRIPTION:
          return this.processSubscriptionWebhook(
            notification as SubscriptionWebhookEvent
          );

        case WebhookEventType.MERCHANT_ORDER:
          return this.processMerchantOrderWebhook(
            notification as MerchantOrderWebhookEvent
          );

        default:
          // Para outros tipos de webhook, apenas registramos
          logger.info(
            `Webhook recebido de tipo não processável: ${eventType}`,
            {
              data: notification.data,
            }
          );

          return {
            success: true,
            type: eventType,
            resourceId: notification.data?.id,
            message: `Webhook de tipo ${eventType} recebido, mas não processado`,
          };
      }
    } catch (error) {
      logger.error("Erro ao processar webhook do MercadoPago", {
        error,
        notification,
      });

      return {
        success: false,
        type: notification.type,
        resourceId: notification.data?.id,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        errorCode: "WEBHOOK_PROCESSING_ERROR",
      };
    }
  }

  /**
   * Registra o recebimento de um webhook no banco de dados
   * @param notification Dados da notificação
   */
  private async logWebhookReceived(
    notification: WebhookNotification
  ): Promise<void> {
    try {
      // Registra o webhook no banco de dados para auditoria
      await prisma.webhookNotification.create({
        data: {
          source: "mercadopago",
          eventType: notification.type,
          eventId: notification.id,
          liveMode: notification.live_mode ?? true,
          apiVersion: notification.api_version,
          rawData: notification as any,
          processStatus: "pending",
        },
      });
    } catch (error) {
      // Não interrompemos o fluxo mesmo se falhar o log
      logger.error("Erro ao registrar webhook no banco de dados", {
        error,
        type: notification.type,
        id: notification.id,
      });
    }
  }

  /**
   * Valida o formato de um webhook
   * @param notification Dados da notificação
   * @param eventType Tipo de evento normalizado
   * @returns Resultado da validação
   */
  private validateWebhook(
    notification: WebhookNotification,
    eventType: WebhookEventType
  ): { isValid: boolean; error?: string } {
    try {
      // CORREÇÃO: Verifica se está em modo de teste
      const isTestMode = mercadoPagoConfig.isTestMode(
        notification.integrationType
      );
      const isTestWebhook = WebhookValidator.isTestWebhook(notification);

      // Para webhooks de teste, aplicamos validação mais flexível
      if (isTestMode || isTestWebhook) {
        // Verificação mínima - apenas se tem data.id
        if (!notification.data || !notification.data.id) {
          return {
            isValid: false,
            error: "Webhook de teste sem ID do recurso",
          };
        }

        return { isValid: true };
      }

      // Valida com schema genérico primeiro
      const baseResult = webhookSchema.validate(notification, {
        abortEarly: false,
      });

      if (baseResult.error) {
        return {
          isValid: false,
          error: baseResult.error.message,
        };
      }

      // Valida com schema específico do tipo
      let specificResult;

      switch (eventType) {
        case WebhookEventType.PAYMENT:
          specificResult = paymentWebhookSchema.validate(notification, {
            abortEarly: false,
          });
          break;

        case WebhookEventType.SUBSCRIPTION:
          specificResult = subscriptionWebhookSchema.validate(notification, {
            abortEarly: false,
          });
          break;

        case WebhookEventType.MERCHANT_ORDER:
          specificResult = merchantOrderWebhookSchema.validate(notification, {
            abortEarly: false,
          });
          break;

        default:
          // Para outros tipos, apenas a validação básica é suficiente
          return { isValid: true };
      }

      if (specificResult?.error) {
        return {
          isValid: false,
          error: specificResult.error.message,
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido na validação",
      };
    }
  }

  /**
   * Processa um webhook de pagamento
   * @param notification Dados da notificação de pagamento
   * @returns Resultado do processamento
   */
  private async processPaymentWebhook(
    notification: PaymentWebhookEvent
  ): Promise<WebhookProcessResponse> {
    try {
      const paymentId = notification.data?.id;

      if (!paymentId) {
        return {
          success: false,
          type: WebhookEventType.PAYMENT,
          error: "ID do pagamento não fornecido",
          errorCode: "MISSING_PAYMENT_ID",
        };
      }

      // CORREÇÃO: Verifica se é um webhook de teste
      const isTestMode = mercadoPagoConfig.isTestMode(
        notification.integrationType
      );
      const isTestWebhook = WebhookValidator.isTestWebhook(notification);

      if (isTestMode || isTestWebhook) {
        logger.info(`Webhook de pagamento TESTE recebido: ID ${paymentId}`, {
          action: notification.action,
          status: notification.data?.status,
          test: true,
        });

        // Atualiza o status do webhook no banco de dados
        await this.updateWebhookStatus(notification.id, "success");

        return {
          success: true,
          type: WebhookEventType.PAYMENT,
          resourceId: paymentId,
          message: `Webhook de pagamento de TESTE processado: ID ${paymentId}`,
        };
      }

      // Registra a ocorrência
      logger.info(`Webhook de pagamento recebido: ID ${paymentId}`, {
        action: notification.action,
        status: notification.data?.status,
      });

      // Atualiza o status do webhook no banco de dados
      await this.updateWebhookStatus(notification.id, "success");

      // Aqui seria implementada a lógica específica para atualizar o pagamento no sistema
      // Como este é o módulo core, apenas retornamos sucesso
      // O processamento real seria feito nos módulos específicos (checkout/subscription)

      return {
        success: true,
        type: WebhookEventType.PAYMENT,
        resourceId: paymentId,
        message: `Webhook de pagamento processado com sucesso: ID ${paymentId}`,
      };
    } catch (error) {
      logger.error("Erro ao processar webhook de pagamento", {
        error,
        paymentId: notification.data?.id,
      });

      // Atualiza o status do webhook no banco de dados
      await this.updateWebhookStatus(notification.id, "failed", error);

      return {
        success: false,
        type: WebhookEventType.PAYMENT,
        resourceId: notification.data?.id,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        errorCode: "PAYMENT_WEBHOOK_PROCESSING_ERROR",
      };
    }
  }

  /**
   * Processa um webhook de assinatura
   * @param notification Dados da notificação de assinatura
   * @returns Resultado do processamento
   */
  private async processSubscriptionWebhook(
    notification: SubscriptionWebhookEvent
  ): Promise<WebhookProcessResponse> {
    try {
      const subscriptionId = notification.data?.id;

      if (!subscriptionId) {
        return {
          success: false,
          type: WebhookEventType.SUBSCRIPTION,
          error: "ID da assinatura não fornecido",
          errorCode: "MISSING_SUBSCRIPTION_ID",
        };
      }

      // CORREÇÃO: Verifica se é um webhook de teste
      const isTestMode = mercadoPagoConfig.isTestMode(
        notification.integrationType
      );
      const isTestWebhook = WebhookValidator.isTestWebhook(notification);

      if (isTestMode || isTestWebhook) {
        logger.info(
          `Webhook de assinatura TESTE recebido: ID ${subscriptionId}`,
          {
            action: notification.action,
            status: notification.data?.status,
            test: true,
          }
        );

        // Atualiza o status do webhook no banco de dados
        await this.updateWebhookStatus(notification.id, "success");

        return {
          success: true,
          type: WebhookEventType.SUBSCRIPTION,
          resourceId: subscriptionId,
          message: `Webhook de assinatura de TESTE processado: ID ${subscriptionId}`,
        };
      }

      // Registra a ocorrência
      logger.info(`Webhook de assinatura recebido: ID ${subscriptionId}`, {
        action: notification.action,
        status: notification.data?.status,
      });

      // Atualiza o status do webhook no banco de dados
      await this.updateWebhookStatus(notification.id, "success");

      // Aqui seria implementada a lógica específica para atualizar a assinatura no sistema
      // Como este é o módulo core, apenas retornamos sucesso
      // O processamento real seria feito no módulo de subscription

      return {
        success: true,
        type: WebhookEventType.SUBSCRIPTION,
        resourceId: subscriptionId,
        message: `Webhook de assinatura processado com sucesso: ID ${subscriptionId}`,
      };
    } catch (error) {
      logger.error("Erro ao processar webhook de assinatura", {
        error,
        subscriptionId: notification.data?.id,
      });

      // Atualiza o status do webhook no banco de dados
      await this.updateWebhookStatus(notification.id, "failed", error);

      return {
        success: false,
        type: WebhookEventType.SUBSCRIPTION,
        resourceId: notification.data?.id,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        errorCode: "SUBSCRIPTION_WEBHOOK_PROCESSING_ERROR",
      };
    }
  }

  /**
   * Processa um webhook de ordem do mercador
   * @param notification Dados da notificação de ordem
   * @returns Resultado do processamento
   */
  private async processMerchantOrderWebhook(
    notification: MerchantOrderWebhookEvent
  ): Promise<WebhookProcessResponse> {
    try {
      const orderId = notification.data?.id;

      if (!orderId) {
        return {
          success: false,
          type: WebhookEventType.MERCHANT_ORDER,
          error: "ID da ordem não fornecido",
          errorCode: "MISSING_ORDER_ID",
        };
      }

      // CORREÇÃO: Verifica se é um webhook de teste
      const isTestMode = mercadoPagoConfig.isTestMode(
        notification.integrationType
      );
      const isTestWebhook = WebhookValidator.isTestWebhook(notification);

      if (isTestMode || isTestWebhook) {
        logger.info(`Webhook de ordem TESTE recebido: ID ${orderId}`, {
          test: true,
        });

        // Atualiza o status do webhook no banco de dados
        await this.updateWebhookStatus(notification.id, "success");

        return {
          success: true,
          type: WebhookEventType.MERCHANT_ORDER,
          resourceId: orderId,
          message: `Webhook de ordem de TESTE processado: ID ${orderId}`,
        };
      }

      // Registra a ocorrência
      logger.info(`Webhook de ordem recebido: ID ${orderId}`);

      // Atualiza o status do webhook no banco de dados
      await this.updateWebhookStatus(notification.id, "success");

      // Aqui seria implementada a lógica específica para atualizar a ordem no sistema
      // Como este é o módulo core, apenas retornamos sucesso
      // O processamento real seria feito nos módulos específicos (checkout/subscription)

      return {
        success: true,
        type: WebhookEventType.MERCHANT_ORDER,
        resourceId: orderId,
        message: `Webhook de ordem processado com sucesso: ID ${orderId}`,
      };
    } catch (error) {
      logger.error("Erro ao processar webhook de ordem", {
        error,
        orderId: notification.data?.id,
      });

      // Atualiza o status do webhook no banco de dados
      await this.updateWebhookStatus(notification.id, "failed", error);

      return {
        success: false,
        type: WebhookEventType.MERCHANT_ORDER,
        resourceId: notification.data?.id,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        errorCode: "ORDER_WEBHOOK_PROCESSING_ERROR",
      };
    }
  }

  /**
   * Atualiza o status de processamento de um webhook no banco de dados
   * @param eventId ID do evento
   * @param status Status de processamento
   * @param error Erro ocorrido (opcional)
   */
  private async updateWebhookStatus(
    eventId?: string,
    status: "success" | "failed" | "pending" = "success",
    error?: unknown
  ): Promise<void> {
    if (!eventId) return;

    try {
      await prisma.webhookNotification.updateMany({
        where: { eventId },
        data: {
          processStatus: status,
          processedAt: new Date(),
          error:
            error instanceof Error
              ? error.message
              : error
              ? String(error)
              : null,
        },
      });
    } catch (dbError) {
      logger.error("Erro ao atualizar status do webhook no banco de dados", {
        dbError,
        eventId,
        status,
      });
    }
  }
}
