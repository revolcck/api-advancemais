/**
 * Utilitários de logging específicos para o módulo de assinatura
 * Usado para monitorar a transição entre o sistema legado e o novo
 */
import { logger } from "@/shared/utils/logger.utils";

/**
 * Logs específicos para o módulo de assinatura
 */
export class SubscriptionLogger {
  /**
   * Registra uma ação no módulo de assinatura com contexto
   */
  static log(
    action: string,
    details: any,
    level: "info" | "debug" | "warn" | "error" = "info"
  ): void {
    if (level === "info") {
      logger.info(`[Subscription][${action}]`, details);
    } else if (level === "debug") {
      logger.debug(`[Subscription][${action}]`, details);
    } else if (level === "warn") {
      logger.warn(`[Subscription][${action}]`, details);
    } else if (level === "error") {
      logger.error(`[Subscription][${action}]`, details);
    }
  }

  /**
   * Registra a criação de uma assinatura
   */
  static logSubscriptionCreated(
    subscriptionId: string,
    userId: string,
    planId: string
  ): void {
    this.log("subscription_created", { subscriptionId, userId, planId });
  }

  /**
   * Registra a atualização de uma assinatura
   */
  static logSubscriptionUpdated(
    subscriptionId: string,
    userId: string,
    oldStatus: string,
    newStatus: string
  ): void {
    this.log("subscription_updated", {
      subscriptionId,
      userId,
      oldStatus,
      newStatus,
    });
  }

  /**
   * Registra o cancelamento de uma assinatura
   */
  static logSubscriptionCancelled(
    subscriptionId: string,
    userId: string,
    reason?: string
  ): void {
    this.log("subscription_cancelled", { subscriptionId, userId, reason });
  }

  /**
   * Registra a criação de um plano
   */
  static logPlanCreated(
    planId: string,
    adminId: string,
    planName: string
  ): void {
    this.log("plan_created", { planId, adminId, planName });
  }

  /**
   * Registra a atualização de um plano
   */
  static logPlanUpdated(
    planId: string,
    adminId: string,
    planName: string
  ): void {
    this.log("plan_updated", { planId, adminId, planName });
  }

  /**
   * Registra uma mudança de status de um plano
   */
  static logPlanStatusChanged(
    planId: string,
    adminId: string,
    isActive: boolean
  ): void {
    this.log("plan_status_changed", {
      planId,
      adminId,
      status: isActive ? "active" : "inactive",
    });
  }

  /**
   * Registra processamento de webhook
   */
  static logWebhookProcessed(
    webhookId: string,
    eventType: string,
    success: boolean
  ): void {
    this.log("webhook_processed", { webhookId, eventType, success });
  }

  /**
   * Registra um erro no módulo de assinatura
   */
  static logError(action: string, error: any, context?: any): void {
    this.log(
      action,
      { error: error instanceof Error ? error.message : error, context },
      "error"
    );
  }
}
