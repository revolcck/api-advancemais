import { logger } from "@/shared/utils/logger.utils";
import { prisma } from "@/config/database";
import { AuditService } from "@/shared/services/audit.service";
import { NotFoundError, ValidationError } from "@/shared/errors/AppError";
import { SubscriptionPlan, BillingInterval } from "@prisma/client";
import {
  CreatePlanDTO,
  UpdatePlanDTO,
  PlanResponseDTO,
  PlanFilterDTO,
} from "../dto/plan.dto";
import { IPlanService } from "../interfaces/plan.interface";

/**
 * Serviço para gerenciamento de planos de assinatura
 */
export class PlanService implements IPlanService {
  /**
   * Criar um novo plano de assinatura
   * @param data Dados do plano
   * @param userId ID do usuário administrador que está criando o plano
   */
  public async createPlan(
    data: CreatePlanDTO,
    userId: string
  ): Promise<PlanResponseDTO> {
    try {
      logger.info(`Criando novo plano de assinatura: ${data.name}`);

      // Verificar se já existe um plano com o mesmo nome
      const existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { name: data.name },
      });

      if (existingPlan) {
        throw new ValidationError(
          `Já existe um plano com o nome "${data.name}"`
        );
      }

      // Criar o plano no banco de dados
      const plan = await prisma.subscriptionPlan.create({
        data: {
          name: data.name,
          price: data.price,
          description: data.description,
          features: data.features,
          interval: data.interval || BillingInterval.MONTHLY,
          intervalCount: data.intervalCount || 1,
          trialDays: data.trialDays,
          isActive: data.isActive !== undefined ? data.isActive : true,
          isPopular: data.isPopular || false,
          mpProductId: data.mpProductId,
          maxJobOffers: data.maxJobOffers,
          featuredJobOffers: data.featuredJobOffers,
          confidentialOffers:
            data.confidentialOffers !== undefined
              ? data.confidentialOffers
              : false,
          resumeAccess:
            data.resumeAccess !== undefined ? data.resumeAccess : true,
          allowPremiumFilters:
            data.allowPremiumFilters !== undefined
              ? data.allowPremiumFilters
              : false,
        },
      });

      // Registro de auditoria
      AuditService.create("subscription_plan", plan.id, userId, {
        planName: plan.name,
        price: plan.price,
      });

      logger.info(`Plano de assinatura criado com sucesso: ${plan.id}`);

      return this.mapPlanToResponseDTO(plan);
    } catch (error) {
      logger.error(`Erro ao criar plano de assinatura: ${error}`);
      throw error;
    }
  }

  /**
   * Atualizar um plano de assinatura existente
   * @param id ID do plano
   * @param data Dados para atualização
   * @param userId ID do usuário administrador que está atualizando
   */
  public async updatePlan(
    id: string,
    data: UpdatePlanDTO,
    userId: string
  ): Promise<PlanResponseDTO> {
    try {
      logger.info(`Atualizando plano de assinatura: ${id}`);

      // Verificar se o plano existe
      const existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { id },
      });

      if (!existingPlan) {
        throw new NotFoundError("Plano de assinatura", "PLAN_NOT_FOUND");
      }

      // Verificar se há tentativa de alteração de nome para um nome já existente
      if (data.name && data.name !== existingPlan.name) {
        const nameExists = await prisma.subscriptionPlan.findFirst({
          where: {
            name: data.name,
            id: { not: id },
          },
        });

        if (nameExists) {
          throw new ValidationError(
            `Já existe um plano com o nome "${data.name}"`
          );
        }
      }

      // Atualizar o plano
      const updatedPlan = await prisma.subscriptionPlan.update({
        where: { id },
        data: {
          name: data.name,
          price: data.price,
          description: data.description,
          features: data.features !== undefined ? data.features : undefined,
          interval: data.interval,
          intervalCount: data.intervalCount,
          trialDays: data.trialDays,
          isActive: data.isActive,
          isPopular: data.isPopular,
          mpProductId: data.mpProductId,
          maxJobOffers: data.maxJobOffers,
          featuredJobOffers: data.featuredJobOffers,
          confidentialOffers: data.confidentialOffers,
          resumeAccess: data.resumeAccess,
          allowPremiumFilters: data.allowPremiumFilters,
          updatedAt: new Date(),
        },
      });

      // Registro de auditoria
      AuditService.update("subscription_plan", id, userId, {
        planName: updatedPlan.name,
        price: updatedPlan.price,
        isActive: updatedPlan.isActive,
      });

      logger.info(`Plano de assinatura atualizado com sucesso: ${id}`);

      return this.mapPlanToResponseDTO(updatedPlan);
    } catch (error) {
      logger.error(`Erro ao atualizar plano de assinatura ${id}: ${error}`);
      throw error;
    }
  }

  /**
   * Ativar ou desativar um plano de assinatura
   * @param id ID do plano
   * @param active Status de ativação
   * @param userId ID do usuário administrador
   */
  public async togglePlanStatus(
    id: string,
    active: boolean,
    userId: string
  ): Promise<PlanResponseDTO> {
    try {
      logger.info(
        `${active ? "Ativando" : "Desativando"} plano de assinatura: ${id}`
      );

      // Verificar se o plano existe
      const existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { id },
      });

      if (!existingPlan) {
        throw new NotFoundError("Plano de assinatura", "PLAN_NOT_FOUND");
      }

      // Atualizar o status do plano
      const updatedPlan = await prisma.subscriptionPlan.update({
        where: { id },
        data: {
          isActive: active,
          updatedAt: new Date(),
        },
      });

      // Registro de auditoria
      AuditService.log(
        active ? "plan_activated" : "plan_deactivated",
        "subscription_plan",
        id,
        userId,
        { planName: updatedPlan.name }
      );

      logger.info(
        `Status do plano ${id} atualizado para: ${active ? "ativo" : "inativo"}`
      );

      return this.mapPlanToResponseDTO(updatedPlan);
    } catch (error) {
      logger.error(`Erro ao alterar status do plano ${id}: ${error}`);
      throw error;
    }
  }

  /**
   * Obter um plano pelo ID
   * @param id ID do plano
   */
  public async getPlanById(id: string): Promise<PlanResponseDTO> {
    try {
      logger.info(`Buscando plano de assinatura: ${id}`);

      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id },
      });

      if (!plan) {
        throw new NotFoundError("Plano de assinatura", "PLAN_NOT_FOUND");
      }

      return this.mapPlanToResponseDTO(plan);
    } catch (error) {
      logger.error(`Erro ao buscar plano de assinatura ${id}: ${error}`);
      throw error;
    }
  }

  /**
   * Listar todos os planos de assinatura com filtros opcionais
   * @param filter Filtros para a busca
   * @param includeInactive Incluir planos inativos
   */
  public async listPlans(
    filter?: PlanFilterDTO,
    includeInactive: boolean = false
  ): Promise<PlanResponseDTO[]> {
    try {
      logger.info("Listando planos de assinatura");

      // Construir filtros para a consulta
      const where: any = {};

      if (!includeInactive) {
        where.isActive = true;
      }

      if (filter) {
        if (filter.id) where.id = filter.id;
        if (filter.name) where.name = { contains: filter.name };
        if (filter.isActive !== undefined) where.isActive = filter.isActive;
        if (filter.isPopular !== undefined) where.isPopular = filter.isPopular;
        if (filter.interval) where.interval = filter.interval;

        // Filtros de preço min/max
        if (filter.priceMin !== undefined || filter.priceMax !== undefined) {
          where.price = {};

          if (filter.priceMin !== undefined) {
            where.price.gte = filter.priceMin;
          }

          if (filter.priceMax !== undefined) {
            where.price.lte = filter.priceMax;
          }
        }
      }

      // Buscar planos no banco
      const plans = await prisma.subscriptionPlan.findMany({
        where,
        orderBy: { price: "asc" },
      });

      logger.debug(`Encontrados ${plans.length} planos de assinatura`);

      // Transformar em DTOs de resposta
      return plans.map((plan) => this.mapPlanToResponseDTO(plan));
    } catch (error) {
      logger.error(`Erro ao listar planos de assinatura: ${error}`);
      throw error;
    }
  }

  /**
   * Verificar se um plano está ativo
   * @param planId ID do plano
   */
  public async isPlanActive(planId: string): Promise<boolean> {
    try {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId },
        select: { isActive: true },
      });

      return plan?.isActive || false;
    } catch (error) {
      logger.error(`Erro ao verificar status do plano ${planId}: ${error}`);
      return false;
    }
  }

  /**
   * Mapear um modelo de plano para o DTO de resposta
   * @param plan Plano do banco de dados
   */
  private mapPlanToResponseDTO(plan: SubscriptionPlan): PlanResponseDTO {
    return {
      id: plan.id,
      name: plan.name,
      price: Number(plan.price),
      description: plan.description,
      features: plan.features as Record<string, any>,
      interval: plan.interval,
      intervalCount: plan.intervalCount,
      trialDays: plan.trialDays,
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      maxJobOffers: plan.maxJobOffers,
      featuredJobOffers: plan.featuredJobOffers,
      confidentialOffers: plan.confidentialOffers,
      resumeAccess: plan.resumeAccess,
      allowPremiumFilters: plan.allowPremiumFilters,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}

// Exporta uma instância do serviço para uso global
export const planService = new PlanService();
