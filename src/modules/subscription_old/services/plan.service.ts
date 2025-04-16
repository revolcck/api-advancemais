/**
 * Serviço para gerenciamento de planos de assinatura
 * @module modules/subscription/services/plan.service
 */

import { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/config/database";
import { logger } from "@/shared/utils/logger.utils";
import {
  ICreatePlanDTO,
  IUpdatePlanDTO,
  IPlanService,
} from "../interfaces/plan.interface";
import { AppError } from "@/shared/errors/AppError";

// Classes customizadas de erro para o módulo de assinatura
class NotFoundError extends AppError {
  constructor(message: string, errorCode: string = "NOT_FOUND") {
    super(message, 404, errorCode);
  }
}

class BadRequestError extends AppError {
  constructor(message: string, errorCode: string = "BAD_REQUEST") {
    super(message, 400, errorCode);
  }
}

/**
 * Implementação do serviço de planos de assinatura
 */
export class PlanService implements IPlanService {
  /**
   * Cria um novo plano de assinatura
   * @param data Dados do plano
   * @returns Plano criado
   */
  public async createPlan(data: ICreatePlanDTO): Promise<SubscriptionPlan> {
    try {
      // Verifica se já existe um plano com o mesmo nome
      const existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { name: data.name },
      });

      if (existingPlan) {
        throw new BadRequestError(
          `Já existe um plano com o nome "${data.name}"`,
          "PLAN_NAME_ALREADY_EXISTS"
        );
      }

      // Cria o plano no banco de dados
      const plan = await prisma.subscriptionPlan.create({
        data: {
          name: data.name,
          price: data.price,
          description: data.description,
          features: data.features as any,
          interval: data.interval,
          intervalCount: data.intervalCount,
          trialDays: data.trialDays,
          isActive: data.isActive ?? true,
          isPopular: data.isPopular ?? false,
          mpProductId: data.mpProductId,
          maxJobOffers: data.maxJobOffers,
          featuredJobOffers: data.featuredJobOffers,
          confidentialOffers: data.confidentialOffers ?? false,
          resumeAccess: data.resumeAccess ?? true,
          allowPremiumFilters: data.allowPremiumFilters ?? false,
        },
      });

      logger.info(`Plano de assinatura criado com sucesso: ${plan.id}`, {
        planId: plan.id,
        planName: plan.name,
      });

      return plan;
    } catch (error) {
      logger.error("Erro ao criar plano de assinatura:", error);
      throw error;
    }
  }

  /**
   * Atualiza um plano de assinatura existente
   * @param id ID do plano
   * @param data Dados a serem atualizados
   * @returns Plano atualizado
   */
  public async updatePlan(
    id: string,
    data: IUpdatePlanDTO
  ): Promise<SubscriptionPlan> {
    try {
      // Verifica se o plano existe
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id },
      });

      if (!plan) {
        throw new NotFoundError("Plano não encontrado", "PLAN_NOT_FOUND");
      }

      // Verifica se o nome já está em uso (se estiver sendo atualizado)
      if (data.name && data.name !== plan.name) {
        const existingPlan = await prisma.subscriptionPlan.findUnique({
          where: { name: data.name },
        });

        if (existingPlan) {
          throw new BadRequestError(
            `Já existe um plano com o nome "${data.name}"`,
            "PLAN_NAME_ALREADY_EXISTS"
          );
        }
      }

      // Atualiza o plano
      const updatedPlan = await prisma.subscriptionPlan.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.price !== undefined && { price: data.price }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.features && { features: data.features as any }),
          ...(data.interval && { interval: data.interval }),
          ...(data.intervalCount !== undefined && {
            intervalCount: data.intervalCount,
          }),
          ...(data.trialDays !== undefined && { trialDays: data.trialDays }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.isPopular !== undefined && { isPopular: data.isPopular }),
          ...(data.mpProductId !== undefined && {
            mpProductId: data.mpProductId,
          }),
          ...(data.maxJobOffers !== undefined && {
            maxJobOffers: data.maxJobOffers,
          }),
          ...(data.featuredJobOffers !== undefined && {
            featuredJobOffers: data.featuredJobOffers,
          }),
          ...(data.confidentialOffers !== undefined && {
            confidentialOffers: data.confidentialOffers,
          }),
          ...(data.resumeAccess !== undefined && {
            resumeAccess: data.resumeAccess,
          }),
          ...(data.allowPremiumFilters !== undefined && {
            allowPremiumFilters: data.allowPremiumFilters,
          }),
        },
      });

      logger.info(`Plano de assinatura atualizado: ${id}`, {
        planId: id,
        planName: updatedPlan.name,
      });

      return updatedPlan;
    } catch (error) {
      logger.error(`Erro ao atualizar plano de assinatura ${id}:`, error);
      throw error;
    }
  }

  /**
   * Exclui um plano de assinatura
   * @param id ID do plano
   * @returns Plano excluído
   */
  public async deletePlan(id: string): Promise<SubscriptionPlan> {
    try {
      // Verifica se o plano existe
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id },
      });

      if (!plan) {
        throw new NotFoundError("Plano não encontrado", "PLAN_NOT_FOUND");
      }

      // Verifica se existem assinaturas vinculadas a este plano
      const subscriptionCount = await prisma.subscription.count({
        where: { planId: id },
      });

      if (subscriptionCount > 0) {
        throw new BadRequestError(
          "Não é possível excluir um plano com assinaturas ativas",
          "PLAN_HAS_ACTIVE_SUBSCRIPTIONS"
        );
      }

      // Exclui o plano
      const deletedPlan = await prisma.subscriptionPlan.delete({
        where: { id },
      });

      logger.info(`Plano de assinatura excluído: ${id}`, {
        planId: id,
        planName: deletedPlan.name,
      });

      return deletedPlan;
    } catch (error) {
      logger.error(`Erro ao excluir plano de assinatura ${id}:`, error);
      throw error;
    }
  }

  /**
   * Obtém um plano de assinatura pelo ID
   * @param id ID do plano
   * @returns Plano encontrado ou null
   */
  public async getPlanById(id: string): Promise<SubscriptionPlan | null> {
    try {
      return await prisma.subscriptionPlan.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error(`Erro ao buscar plano de assinatura ${id}:`, error);
      throw error;
    }
  }

  /**
   * Obtém todos os planos de assinatura
   * @param includeInactive Se deve incluir planos inativos
   * @returns Lista de planos
   */
  public async getAllPlans(
    includeInactive: boolean = false
  ): Promise<SubscriptionPlan[]> {
    try {
      return await prisma.subscriptionPlan.findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: [{ isPopular: "desc" }, { price: "asc" }],
      });
    } catch (error) {
      logger.error("Erro ao listar planos de assinatura:", error);
      throw error;
    }
  }

  /**
   * Obtém apenas os planos ativos
   * @returns Lista de planos ativos
   */
  public async getActivePlans(): Promise<SubscriptionPlan[]> {
    return this.getAllPlans(false);
  }

  /**
   * Altera o status de um plano (ativo/inativo)
   * @param id ID do plano
   * @param active Status a ser definido
   * @returns Plano atualizado
   */
  public async togglePlanStatus(
    id: string,
    active: boolean
  ): Promise<SubscriptionPlan> {
    try {
      // Verifica se o plano existe
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id },
      });

      if (!plan) {
        throw new NotFoundError("Plano não encontrado", "PLAN_NOT_FOUND");
      }

      // Atualiza o status
      const updatedPlan = await prisma.subscriptionPlan.update({
        where: { id },
        data: { isActive: active },
      });

      logger.info(`Status do plano de assinatura alterado: ${id}`, {
        planId: id,
        planName: updatedPlan.name,
        active,
      });

      return updatedPlan;
    } catch (error) {
      logger.error(
        `Erro ao alterar status do plano de assinatura ${id}:`,
        error
      );
      throw error;
    }
  }
}

// Instância do serviço para exportação
export const planService = new PlanService();
