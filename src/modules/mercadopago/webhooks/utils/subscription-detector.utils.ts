/**
 * Utilitários para detecção de qual sistema de assinatura deve processar um webhook
 * Ajuda na transição entre o sistema legado e o novo
 */
import { prisma } from "@/config/database";
import { logger } from "@/shared/utils/logger.utils";
import { SubscriptionLogger } from "../../subscription/utils/logging.utils";

/**
 * Serviço de detecção para identificação do sistema correto para processamento
 */
export class SubscriptionDetector {
  /**
   * Determina qual sistema deve processar o webhook de assinatura
   * @param subscriptionId ID da assinatura no MercadoPago
   * @returns 'new' se deve usar o novo sistema, 'legacy' se deve usar o sistema legado
   */
  static async detectSystem(subscriptionId: string): Promise<"new" | "legacy"> {
    try {
      // Verificar primeiro se existe no novo sistema
      const newSubscription = await prisma.subscription.findFirst({
        where: {
          mpSubscriptionId: subscriptionId,
          // Indicador opcional que pode ser adicionado para marcar assinaturas do novo sistema
          // metadataJson: { has: 'new_system' }
        },
      });

      if (newSubscription) {
        logger.debug(`Assinatura ${subscriptionId} encontrada no novo sistema`);
        return "new";
      }

      // Verificar se existe no sistema legado
      const legacySubscription = await prisma.subscription.findFirst({
        where: {
          mpSubscriptionId: subscriptionId,
          // Sem indicador de novo sistema
        },
      });

      if (legacySubscription) {
        logger.debug(
          `Assinatura ${subscriptionId} encontrada no sistema legado`
        );
        return "legacy";
      }

      // Se não encontrou em nenhum sistema, assumir que é uma assinatura nova
      logger.info(
        `Assinatura ${subscriptionId} não encontrada em nenhum sistema. Assumindo nova.`
      );
      return "new";
    } catch (error) {
      // Em caso de erro, logar e assumir que é do novo sistema
      SubscriptionLogger.logError("detect_system", error, { subscriptionId });
      return "new";
    }
  }

  /**
   * Determina qual sistema deve processar o webhook de plano
   * @param planId ID do plano no MercadoPago
   * @returns 'new' se deve usar o novo sistema, 'legacy' se deve usar o sistema legado
   */
  static async detectPlanSystem(planId: string): Promise<"new" | "legacy"> {
    try {
      // Verificar se existe um plano com este ID no MP no banco
      const plan = await prisma.subscriptionPlan.findFirst({
        where: {
          mpProductId: planId,
        },
      });

      if (plan) {
        // Se existir, verificar se foi criado pelo novo sistema
        // (aqui você pode adicionar uma lógica mais específica se necessário)
        return "new";
      }

      // Se não encontrou, assumimos que é do sistema legado
      return "legacy";
    } catch (error) {
      // Em caso de erro, logar e assumir que é do novo sistema
      SubscriptionLogger.logError("detect_plan_system", error, { planId });
      return "new";
    }
  }
}
