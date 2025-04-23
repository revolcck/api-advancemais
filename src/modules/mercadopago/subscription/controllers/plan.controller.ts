import { Request, Response } from "express";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { logger } from "@/shared/utils/logger.utils";
import { PlanService } from "../services/plan.service";
import { AuditService } from "@/shared/services/audit.service";
import { PlanFilterDTO } from "../dto/plan.dto";
import { ServiceUnavailableError } from "@/shared/errors/AppError";

/**
 * Controlador para gerenciamento de planos de assinatura
 */
export class PlanController {
  private planService: PlanService;

  constructor() {
    this.planService = new PlanService();
  }

  /**
   * Criar um novo plano de assinatura
   * @route POST /api/mercadopago/subscription/plans
   */
  public createPlan = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info("Iniciando criação de plano de assinatura");

      // O usuário já foi autenticado pelo middleware
      const userId = req.user!.id;
      const planData = req.body;

      // Criar o plano
      const plan = await this.planService.createPlan(planData, userId);

      // Registrar ação de auditoria
      AuditService.log(
        "plan_created",
        "subscription_plan",
        plan.id,
        userId,
        {
          planName: plan.name,
          price: plan.price,
        },
        req
      );

      // Retornar resposta de sucesso
      ApiResponse.success(res, plan, {
        message: "Plano de assinatura criado com sucesso",
        statusCode: 201,
      });
    } catch (error) {
      logger.error("Erro ao criar plano de assinatura", error);
      throw error;
    }
  };

  /**
   * Atualizar um plano de assinatura existente
   * @route PUT /api/mercadopago/subscription/plans/:id
   */
  public updatePlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const planId = req.params.id;
      const userId = req.user!.id;
      const planData = req.body;

      logger.info(`Atualizando plano de assinatura: ${planId}`);

      // Atualizar o plano
      const updatedPlan = await this.planService.updatePlan(
        planId,
        planData,
        userId
      );

      // Registrar ação de auditoria
      AuditService.log(
        "plan_updated",
        "subscription_plan",
        planId,
        userId,
        {
          planName: updatedPlan.name,
          price: updatedPlan.price,
        },
        req
      );

      // Retornar resposta de sucesso
      ApiResponse.success(res, updatedPlan, {
        message: "Plano de assinatura atualizado com sucesso",
      });
    } catch (error) {
      logger.error(
        `Erro ao atualizar plano de assinatura ${req.params.id}`,
        error
      );
      throw error;
    }
  };

  /**
   * Ativar um plano de assinatura
   * @route PATCH /api/mercadopago/subscription/plans/:id/activate
   */
  public activatePlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const planId = req.params.id;
      const userId = req.user!.id;

      logger.info(`Ativando plano de assinatura: ${planId}`);

      // Ativar o plano
      const activatedPlan = await this.planService.togglePlanStatus(
        planId,
        true,
        userId
      );

      // Retornar resposta de sucesso
      ApiResponse.success(res, activatedPlan, {
        message: "Plano de assinatura ativado com sucesso",
      });
    } catch (error) {
      logger.error(
        `Erro ao ativar plano de assinatura ${req.params.id}`,
        error
      );
      throw error;
    }
  };

  /**
   * Desativar um plano de assinatura
   * @route PATCH /api/mercadopago/subscription/plans/:id/deactivate
   */
  public deactivatePlan = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const planId = req.params.id;
      const userId = req.user!.id;

      logger.info(`Desativando plano de assinatura: ${planId}`);

      // Desativar o plano
      const deactivatedPlan = await this.planService.togglePlanStatus(
        planId,
        false,
        userId
      );

      // Retornar resposta de sucesso
      ApiResponse.success(res, deactivatedPlan, {
        message: "Plano de assinatura desativado com sucesso",
      });
    } catch (error) {
      logger.error(
        `Erro ao desativar plano de assinatura ${req.params.id}`,
        error
      );
      throw error;
    }
  };

  /**
   * Obter um plano de assinatura pelo ID
   * @route GET /api/mercadopago/subscription/plans/:id
   */
  public getPlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const planId = req.params.id;

      logger.info(`Buscando plano de assinatura: ${planId}`);

      // Buscar o plano
      const plan = await this.planService.getPlanById(planId);

      // Retornar resposta de sucesso
      ApiResponse.success(res, plan);
    } catch (error) {
      logger.error(
        `Erro ao buscar plano de assinatura ${req.params.id}`,
        error
      );
      throw error;
    }
  };

  /**
   * Listar todos os planos de assinatura com filtros opcionais
   * @route GET /api/mercadopago/subscription/plans
   */
  public listPlans = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info("Listando planos de assinatura");

      // Extrair filtros da query
      const filter: PlanFilterDTO = {};

      if (req.query.name) filter.name = req.query.name as string;
      if (req.query.isActive !== undefined)
        filter.isActive = req.query.isActive === "true";
      if (req.query.isPopular !== undefined)
        filter.isPopular = req.query.isPopular === "true";
      if (req.query.interval) filter.interval = req.query.interval as any;
      if (req.query.priceMin) filter.priceMin = Number(req.query.priceMin);
      if (req.query.priceMax) filter.priceMax = Number(req.query.priceMax);

      // Determinar se deve incluir planos inativos (apenas para admins)
      const includeInactive =
        req.query.includeInactive === "true" &&
        (req.user?.role === "Super Administrador" ||
          req.user?.role === "Administrador");

      try {
        // Buscar os planos
        const plans = await this.planService.listPlans(filter, includeInactive);

        // Retornar resposta de sucesso
        ApiResponse.success(res, plans);
      } catch (error) {
        logger.error("Erro ao obter planos do serviço", error);
        throw new ServiceUnavailableError(
          "Não foi possível listar os planos de assinatura",
          "PLAN_SERVICE_ERROR",
          {
            originalError:
              error instanceof Error ? error.message : String(error),
          }
        );
      }
    } catch (error) {
      logger.error("Erro ao listar planos de assinatura", error);
      throw error;
    }
  };
}
