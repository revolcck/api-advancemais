import { logger } from "@/shared/utils/logger.utils";
import { prisma } from "@/config/database";
import { AuditService } from "@/shared/services/audit.service";
import { BillingInterval } from "../../types/prisma-enums";
import { SubscriptionPlan as PrismaSubscriptionPlan } from "@prisma/client";
import {
  NotFoundError,
  ValidationError,
  ServiceUnavailableError,
} from "@/shared/errors/AppError";
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

      // Criar o plano no banco de dados usando a API "unchecked" do Prisma
      // que permite mais flexibilidade com os tipos
      const plan = await prisma.$queryRaw`
        INSERT INTO subscription_plans (
          name, price, description, features, interval, intervalCount, 
          trialDays, isActive, isPopular, mpProductId, maxJobOffers, 
          featuredJobOffers, confidentialOffers, resumeAccess, allowPremiumFilters
        ) VALUES (
          ${data.name}, 
          ${data.price}, 
          ${data.description}, 
          ${JSON.stringify(data.features)}, 
          ${data.interval || BillingInterval.MONTHLY}, 
          ${data.intervalCount || 1}, 
          ${data.trialDays}, 
          ${data.isActive !== undefined ? data.isActive : true}, 
          ${data.isPopular || false}, 
          ${data.mpProductId}, 
          ${data.maxJobOffers}, 
          ${data.featuredJobOffers}, 
          ${
            data.confidentialOffers !== undefined
              ? data.confidentialOffers
              : false
          }, 
          ${data.resumeAccess !== undefined ? data.resumeAccess : true}, 
          ${
            data.allowPremiumFilters !== undefined
              ? data.allowPremiumFilters
              : false
          }
        ) RETURNING *;
      `;

      // Como o resultado de $queryRaw é um array, pegamos o primeiro elemento
      const createdPlan = Array.isArray(plan) ? plan[0] : plan;

      // Registro de auditoria
      AuditService.create("subscription_plan", createdPlan.id, userId, {
        planName: createdPlan.name,
        price: createdPlan.price,
      });

      logger.info(`Plano de assinatura criado com sucesso: ${createdPlan.id}`);

      // Mapear para o formato de resposta esperado
      return {
        id: createdPlan.id,
        name: createdPlan.name,
        price: Number(createdPlan.price),
        description: createdPlan.description,
        features: createdPlan.features,
        interval: createdPlan.interval as BillingInterval,
        intervalCount: createdPlan.intervalCount,
        trialDays: createdPlan.trialDays,
        isActive: createdPlan.isActive,
        isPopular: createdPlan.isPopular,
        maxJobOffers: createdPlan.maxJobOffers,
        featuredJobOffers: createdPlan.featuredJobOffers,
        confidentialOffers: createdPlan.confidentialOffers,
        resumeAccess: createdPlan.resumeAccess,
        allowPremiumFilters: createdPlan.allowPremiumFilters,
        createdAt: createdPlan.createdAt,
        updatedAt: createdPlan.updatedAt,
      };
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

      // Construir dinamicamente as partes da query SQL para atualizações
      let setClause = "";
      const values: any[] = [];

      if (data.name !== undefined) {
        setClause += "name = ?, ";
        values.push(data.name);
      }
      if (data.price !== undefined) {
        setClause += "price = ?, ";
        values.push(data.price);
      }
      if (data.description !== undefined) {
        setClause += "description = ?, ";
        values.push(data.description);
      }
      if (data.features !== undefined) {
        setClause += "features = ?, ";
        values.push(JSON.stringify(data.features));
      }
      if (data.interval !== undefined) {
        setClause += "interval = ?, ";
        values.push(data.interval);
      }
      if (data.intervalCount !== undefined) {
        setClause += "intervalCount = ?, ";
        values.push(data.intervalCount);
      }
      if (data.trialDays !== undefined) {
        setClause += "trialDays = ?, ";
        values.push(data.trialDays);
      }
      if (data.isActive !== undefined) {
        setClause += "isActive = ?, ";
        values.push(data.isActive);
      }
      if (data.isPopular !== undefined) {
        setClause += "isPopular = ?, ";
        values.push(data.isPopular);
      }
      if (data.mpProductId !== undefined) {
        setClause += "mpProductId = ?, ";
        values.push(data.mpProductId);
      }
      if (data.maxJobOffers !== undefined) {
        setClause += "maxJobOffers = ?, ";
        values.push(data.maxJobOffers);
      }
      if (data.featuredJobOffers !== undefined) {
        setClause += "featuredJobOffers = ?, ";
        values.push(data.featuredJobOffers);
      }
      if (data.confidentialOffers !== undefined) {
        setClause += "confidentialOffers = ?, ";
        values.push(data.confidentialOffers);
      }
      if (data.resumeAccess !== undefined) {
        setClause += "resumeAccess = ?, ";
        values.push(data.resumeAccess);
      }
      if (data.allowPremiumFilters !== undefined) {
        setClause += "allowPremiumFilters = ?, ";
        values.push(data.allowPremiumFilters);
      }

      // Adicionar updatedAt
      setClause += "updatedAt = ?";
      values.push(new Date());

      // Adicionar id como último valor para a condição WHERE
      values.push(id);

      // Executar a query SQL
      const updateQuery = `
        UPDATE subscription_plans
        SET ${setClause}
        WHERE id = ?
        RETURNING *;
      `;

      const updatedPlan = await prisma.$queryRawUnsafe(updateQuery, ...values);
      const plan = Array.isArray(updatedPlan) ? updatedPlan[0] : updatedPlan;

      // Registro de auditoria
      AuditService.update("subscription_plan", id, userId, {
        planName: plan.name,
        price: plan.price,
        isActive: plan.isActive,
      });

      logger.info(`Plano de assinatura atualizado com sucesso: ${id}`);

      return {
        id: plan.id,
        name: plan.name,
        price: Number(plan.price),
        description: plan.description,
        features: plan.features,
        interval: plan.interval as BillingInterval,
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

      // Atualizar o status usando query bruta para evitar problemas de tipo
      const updatedPlan = await prisma.$queryRaw`
        UPDATE subscription_plans
        SET isActive = ${active}, updatedAt = ${new Date()}
        WHERE id = ${id}
        RETURNING *;
      `;

      const plan = Array.isArray(updatedPlan) ? updatedPlan[0] : updatedPlan;

      // Registro de auditoria
      AuditService.log(
        active ? "plan_activated" : "plan_deactivated",
        "subscription_plan",
        id,
        userId,
        { planName: plan.name }
      );

      logger.info(
        `Status do plano ${id} atualizado para: ${active ? "ativo" : "inativo"}`
      );

      return {
        id: plan.id,
        name: plan.name,
        price: Number(plan.price),
        description: plan.description,
        features: plan.features,
        interval: plan.interval as BillingInterval,
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

      return {
        id: plan.id,
        name: plan.name,
        price: Number(plan.price),
        description: plan.description,
        features: plan.features as Record<string, any>,
        interval: plan.interval as BillingInterval,
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
      logger.info("Listando planos de assinatura", { filter, includeInactive });

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
      return plans.map((plan: PrismaSubscriptionPlan) => ({
        id: plan.id,
        name: plan.name,
        price: Number(plan.price),
        description: plan.description,
        features: plan.features as Record<string, any>,
        interval: plan.interval as BillingInterval,
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
      }));
    } catch (error) {
      logger.error(`Erro ao listar planos de assinatura: ${error}`);
      throw new ServiceUnavailableError(
        "Não foi possível listar os planos de assinatura",
        "DATABASE_ERROR",
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
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
}

// Exporta uma instância do serviço para uso global
export const planService = new PlanService();
