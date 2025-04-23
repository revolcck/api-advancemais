import { PaymentService } from "../../core/services/payment.service";
import { logger } from "@/shared/utils/logger.utils";
import { prisma } from "@/config/database";
import { PaymentStatus } from "@prisma/client";
import {
  WebhookNotificationDto,
  WebhookProcessResponseDto,
} from "../../dto/webhook.dto";
import { MercadoPagoPaymentStatus } from "../../dto/payment.dto";
import { SubscriptionService as OldSubscriptionService } from "../../subscription/services/subscription.service";
import { SubscriptionService } from "../../subscription/services/subscription.service";
import { CoursePaymentService } from "../../courses/services/course-payment.service";
import { AuditService } from "@/shared/services/audit.service";
import {
  acquireWebhookLock,
  releaseWebhookLock,
  extractResourceId,
} from "../helpers/webhook.helper";

/**
 * Serviço para processamento de webhooks do MercadoPago
 */
export class WebhookService {
  private paymentService: PaymentService;
  private oldSubscriptionService: OldSubscriptionService;
  private subscriptionService: SubscriptionService;
  private coursePaymentService: CoursePaymentService;

  constructor() {
    this.paymentService = new PaymentService();
    this.oldSubscriptionService = new OldSubscriptionService();
    this.subscriptionService = new SubscriptionService();
    this.coursePaymentService = new CoursePaymentService();
  }

  /**
   * Processa uma notificação de webhook recebida do MercadoPago
   *
   * @param data Dados da notificação
   * @returns Resultado do processamento
   */
  public async processWebhook(
    data: WebhookNotificationDto
  ): Promise<WebhookProcessResponseDto> {
    try {
      logger.info(`Processando webhook do MercadoPago: ${data.action}`, {
        id: data.id,
        dataId: data.data.id,
        type: data.type,
      });

      // Registra a notificação no banco de dados
      await this.paymentService.registerPaymentNotification(
        {
          source: "mercadopago",
          eventType: data.action,
          eventId: data.id,
          apiVersion: data.api_version,
          liveMode: data.live_mode,
        },
        data
      );

      // Implementa um mecanismo de lock para evitar processamento duplicado
      const lockAcquired = await acquireWebhookLock(data.id);

      if (!lockAcquired) {
        logger.warn(`Webhook ${data.id} já está sendo processado, ignorando`);
        return { success: true, message: "Webhook já está sendo processado" };
      }

      try {
        // Extrai ID do recurso
        const resourceId = extractResourceId(data.data.id);

        // Processa de acordo com o tipo de evento
        switch (data.action) {
          case "payment.created":
          case "payment.updated":
            await this.processPaymentUpdate(resourceId);
            break;

          case "subscription.created":
          case "subscription.updated":
            await this.processSubscriptionUpdate(resourceId);
            break;

          case "plan.created":
          case "plan.updated":
            await this.processPlanUpdate(resourceId);
            break;

          case "invoice.created":
          case "invoice.updated":
            await this.processInvoiceUpdate(resourceId);
            break;

          default:
            logger.warn(
              `Tipo de evento de webhook não suportado: ${data.action}`
            );
            return {
              success: false,
              message: `Tipo de evento não suportado: ${data.action}`,
            };
        }

        return {
          success: true,
          message: `Webhook ${data.id} processado com sucesso`,
        };
      } finally {
        // Garante que o lock seja liberado, mesmo em caso de erro
        await releaseWebhookLock(data.id);
      }
    } catch (error) {
      logger.error(`Erro ao processar webhook: ${error}`, error);
      return {
        success: false,
        message: `Erro ao processar webhook: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Processa uma atualização de pagamento
   *
   * @param paymentId ID do pagamento
   */
  private async processPaymentUpdate(paymentId: string): Promise<void> {
    try {
      logger.info(`Processando atualização de pagamento: ${paymentId}`);

      // Busca detalhes do pagamento no MercadoPago
      const paymentDetails = await this.paymentService.getPaymentDetails(
        paymentId
      );

      // Verifica se é um pagamento de assinatura ou curso consultando os metadados
      const isSubscription =
        paymentDetails.metadata?.subscriptionId ||
        paymentDetails.metadata?.subscription_id;

      const isCourse =
        paymentDetails.metadata?.courseId || paymentDetails.metadata?.course_id;

      // Atualiza o status do pagamento no banco de dados
      const payment = await this.updatePaymentStatus(paymentId, paymentDetails);

      if (isSubscription) {
        // Se for pagamento de assinatura, atualiza a assinatura
        const subscriptionId =
          paymentDetails.metadata?.subscriptionId ||
          paymentDetails.metadata?.subscription_id;

        try {
          // Primeiro, tentamos processar com o novo serviço de assinaturas
          await this.subscriptionService.processSubscriptionPayment(
            subscriptionId,
            paymentId,
            paymentDetails.status
          );
          logger.info(
            `Pagamento de assinatura processado pelo novo serviço: ${subscriptionId}`
          );
        } catch (error) {
          // Se falhar, tentamos com o serviço legado
          logger.warn(
            `Erro ao processar pagamento com novo serviço, tentando serviço legado`,
            error
          );
          await this.oldSubscriptionService.processSubscriptionPayment(
            subscriptionId,
            paymentId,
            paymentDetails.status
          );
          logger.info(
            `Pagamento de assinatura processado pelo serviço legado: ${subscriptionId}`
          );
        }
      } else if (isCourse) {
        // Se for pagamento de curso, atualiza a matrícula
        const courseId =
          paymentDetails.metadata?.courseId ||
          paymentDetails.metadata?.course_id;

        const userId =
          paymentDetails.metadata?.userId || paymentDetails.metadata?.user_id;

        if (courseId && userId) {
          await this.coursePaymentService.processCoursePayment(
            courseId,
            userId,
            paymentId,
            paymentDetails.status
          );
        } else {
          logger.warn(
            `Metadados incompletos para pagamento de curso: ${paymentId}`
          );
        }
      } else {
        logger.warn(`Tipo de pagamento não identificrado: ${paymentId}`);
      }

      logger.info(
        `Atualização de pagamento ${paymentId} processada com sucesso`
      );
    } catch (error) {
      logger.error(
        `Erro ao processar atualização de pagamento ${paymentId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Atualiza o status de um pagamento no banco de dados
   *
   * @param mpPaymentId ID do pagamento no MercadoPago
   * @param paymentDetails Detalhes do pagamento
   * @returns Pagamento atualizado
   */
  private async updatePaymentStatus(
    mpPaymentId: string,
    paymentDetails: any
  ): Promise<any> {
    try {
      // Busca pagamento existente pelo ID do MercadoPago
      const existingPayment = await prisma.payment.findFirst({
        where: { mpPaymentId },
        include: { subscription: { include: { user: true } } },
      });

      if (!existingPayment) {
        logger.warn(
          `Pagamento não encontrado no banco de dados: ${mpPaymentId}`
        );
        return null;
      }

      // Mapeia o status do MercadoPago para o status do banco de dados
      const dbStatus = this.mapStatusToDatabase(
        paymentDetails.status
      ) as PaymentStatus;

      // Atualiza o pagamento
      const updatedPayment = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: dbStatus,
          mpStatus: paymentDetails.status,
          mpStatusDetail: paymentDetails.status_detail,
          mpPaymentMethodId: paymentDetails.payment_method_id,
          mpPaymentTypeId: paymentDetails.payment_type_id,
          gatewayResponse: paymentDetails,
          updatedAt: new Date(),
        },
        include: { subscription: { include: { user: true } } },
      });

      // Registro de auditoria
      const userId = existingPayment.subscription?.userId;

      if (userId) {
        AuditService.log(
          "payment_status_updated",
          "payment",
          existingPayment.id,
          userId,
          {
            mpPaymentId,
            oldStatus: existingPayment.status,
            newStatus: updatedPayment.status,
            amount: existingPayment.amount,
          }
        );
      }

      logger.info(
        `Status do pagamento ${mpPaymentId} atualizado: ${updatedPayment.status}`
      );
      return updatedPayment;
    } catch (error) {
      logger.error(
        `Erro ao atualizar status do pagamento ${mpPaymentId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Mapeia o status do MercadoPago para o formato do banco de dados
   */
  private mapStatusToDatabase(mpStatus: string): string {
    switch (mpStatus) {
      case MercadoPagoPaymentStatus.APPROVED:
        return "APPROVED";
      case MercadoPagoPaymentStatus.PENDING:
        return "PENDING";
      case MercadoPagoPaymentStatus.IN_PROCESS:
        return "IN_PROCESS";
      case MercadoPagoPaymentStatus.REJECTED:
        return "REJECTED";
      case MercadoPagoPaymentStatus.CANCELLED:
        return "CANCELLED";
      case MercadoPagoPaymentStatus.REFUNDED:
        return "REFUNDED";
      case MercadoPagoPaymentStatus.CHARGED_BACK:
        return "CHARGED_BACK";
      case MercadoPagoPaymentStatus.IN_MEDIATION:
        return "IN_MEDIATION";
      default:
        return "PENDING";
    }
  }

  /**
   * Processa uma atualização de assinatura
   *
   * @param subscriptionId ID da assinatura
   */
  private async processSubscriptionUpdate(
    subscriptionId: string
  ): Promise<void> {
    try {
      logger.info(`Processando atualização de assinatura: ${subscriptionId}`);

      // Importar o detector sob demanda para evitar referência circular
      const { SubscriptionDetector } = await import(
        "../utils/subscription-detector.utils"
      );

      // Detectar qual sistema deve processar esta assinatura
      const system = await SubscriptionDetector.detectSystem(subscriptionId);

      if (system === "new") {
        logger.info(
          `Processando assinatura ${subscriptionId} com o novo serviço`
        );

        try {
          await this.subscriptionService.processSubscriptionUpdate(
            subscriptionId
          );
          logger.info(
            `Atualização de assinatura ${subscriptionId} processada com sucesso pelo novo serviço`
          );
          return;
        } catch (error) {
          // Se falhar mesmo sendo detectado como novo, tentamos o legado como fallback
          logger.warn(
            `Erro ao processar com novo serviço apesar de ser detectado como novo, tentando serviço legado`,
            error
          );
        }
      } else {
        logger.info(
          `Processando assinatura ${subscriptionId} com o serviço legado`
        );
      }

      // Tentativa com o serviço legado
      await this.oldSubscriptionService.processSubscriptionUpdate(
        subscriptionId
      );
      logger.info(
        `Atualização de assinatura ${subscriptionId} processada com sucesso pelo serviço legado`
      );
    } catch (error) {
      logger.error(
        `Erro ao processar atualização de assinatura ${subscriptionId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Processa uma atualização de plano
   *
   * @param planId ID do plano
   */
  private async processPlanUpdate(planId: string): Promise<void> {
    try {
      logger.info(`Processando atualização de plano: ${planId}`);

      // Importar o detector sob demanda para evitar referência circular
      const { SubscriptionDetector } = await import(
        "../utils/subscription-detector.utils"
      );

      // Detectar qual sistema deve processar este plano
      const system = await SubscriptionDetector.detectPlanSystem(planId);

      if (system === "new") {
        logger.info(`Processando plano ${planId} com o novo serviço`);

        try {
          await this.subscriptionService.processPlanUpdate(planId);
          logger.info(
            `Atualização de plano ${planId} processada com sucesso pelo novo serviço`
          );
          return;
        } catch (error) {
          // Se falhar mesmo sendo detectado como novo, tentamos o legado como fallback
          logger.warn(
            `Erro ao processar plano com novo serviço apesar de ser detectado como novo, tentando serviço legado`,
            error
          );
        }
      } else {
        logger.info(`Processando plano ${planId} com o serviço legado`);
      }

      // Tentativa com o serviço legado
      await this.oldSubscriptionService.processPlanUpdate(planId);
      logger.info(
        `Atualização de plano ${planId} processada com sucesso pelo serviço legado`
      );
    } catch (error) {
      logger.error(`Erro ao processar atualização de plano ${planId}`, error);
      throw error;
    }
  }

  /**
   * Processa uma atualização de fatura
   *
   * @param invoiceId ID da fatura
   */
  private async processInvoiceUpdate(invoiceId: string): Promise<void> {
    try {
      logger.info(`Processando atualização de fatura: ${invoiceId}`);

      // Implementação futura
      logger.info(`Atualização de fatura ${invoiceId} processada com sucesso`);
    } catch (error) {
      logger.error(
        `Erro ao processar atualização de fatura ${invoiceId}`,
        error
      );
      throw error;
    }
  }
}

// Exporta instância única para uso em toda a aplicação
export const webhookService = new WebhookService();
