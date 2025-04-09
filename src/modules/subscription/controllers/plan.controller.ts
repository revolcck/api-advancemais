/**
 * Controlador para gerenciamento de planos de assinatura
 * @module modules/subscription/controllers/plan.controller
 */

import { Request, Response } from "express";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { PlanService } from "../services/plan.service";
import { logger } from "@/shared/utils/logger.utils";
import {
  validate,
  ValidateSource,
} from "@/shared/middleware/validate.middleware";
import {
  createPlanSchema,
  updatePlanSchema,
} from "../validators/plan.validators";

/**
 * Controlador para gerenciamento de planos de assinatura
 */
export class PlanController {
  private planService: PlanService;

  /**
   * Inicializa o controlador com os serviços necessários
   */
  constructor() {
    this.planService = new PlanService();
  }

  /**
   * Cria um novo plano de assinatura
   * @route POST /api/subscription/plans
   */
  public createPlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const planData = req.body;
      const plan = await this.planService.createPlan(planData);

      ApiResponse.success(res, plan, {
        message: "Plano de assinatura criado com sucesso",
        statusCode: 201,
      });
    } catch (error) {
      logger.error("Erro ao criar plano de assinatura:", error);
      ApiResponse.error(res, "Erro ao criar plano de assinatura", {
        code: "PLAN_CREATION_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Atualiza um plano existente
   * @route PUT /api/subscription/plans/:id
   */
  public updatePlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const planData = req.body;

      const updatedPlan = await this.planService.updatePlan(id, planData);

      ApiResponse.success(res, updatedPlan, {
        message: "Plano de assinatura atualizado com sucesso",
      });
    } catch (error) {
      logger.error(`Erro ao atualizar plano ${req.params.id}:`, error);
      ApiResponse.error(res, "Erro ao atualizar plano de assinatura", {
        code: "PLAN_UPDATE_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Exclui um plano existente
   * @route DELETE /api/subscription/plans/:id
   */
  public deletePlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      await this.planService.deletePlan(id);

      ApiResponse.success(res, null, {
        message: "Plano de assinatura excluído com sucesso",
      });
    } catch (error) {
      logger.error(`Erro ao excluir plano ${req.params.id}:`, error);
      ApiResponse.error(res, "Erro ao excluir plano de assinatura", {
        code: "PLAN_DELETE_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Obtém um plano pelo ID
   * @route GET /api/subscription/plans/:id
   */
  public getPlanById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const plan = await this.planService.getPlanById(id);

      if (!plan) {
        ApiResponse.error(res, "Plano não encontrado", {
          code: "PLAN_NOT_FOUND",
          statusCode: 404,
        });
        return;
      }

      ApiResponse.success(res, plan);
    } catch (error) {
      logger.error(`Erro ao buscar plano ${req.params.id}:`, error);
      ApiResponse.error(res, "Erro ao buscar plano de assinatura", {
        code: "PLAN_FETCH_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Lista todos os planos
   * @route GET /api/subscription/plans
   */
  public getAllPlans = async (req: Request, res: Response): Promise<void> => {
    try {
      // Verifica se deve incluir planos inativos (admin only)
      const includeInactive =
        req.query.includeInactive === "true" &&
        (req.user?.role === "ADMIN" ||
          req.user?.role === "Super Administrador");

      const plans = await this.planService.getAllPlans(includeInactive);

      ApiResponse.success(res, plans);
    } catch (error) {
      logger.error("Erro ao listar planos:", error);
      ApiResponse.error(res, "Erro ao listar planos de assinatura", {
        code: "PLANS_FETCH_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Lista apenas planos ativos (para clientes)
   * @route GET /api/subscription/plans/active
   */
  public getActivePlans = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const plans = await this.planService.getActivePlans();

      ApiResponse.success(res, plans);
    } catch (error) {
      logger.error("Erro ao listar planos ativos:", error);
      ApiResponse.error(res, "Erro ao listar planos ativos", {
        code: "ACTIVE_PLANS_FETCH_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Altera o status de um plano (ativo/inativo)
   * @route PATCH /api/subscription/plans/:id/status
   */
  public togglePlanStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { active } = req.body;

      if (typeof active !== "boolean") {
        ApiResponse.error(res, "O parâmetro 'active' deve ser um booleano", {
          code: "INVALID_PARAMETER",
          statusCode: 400,
        });
        return;
      }

      const plan = await this.planService.togglePlanStatus(id, active);

      ApiResponse.success(res, plan, {
        message: `Plano ${active ? "ativado" : "desativado"} com sucesso`,
      });
    } catch (error) {
      logger.error(`Erro ao alterar status do plano ${req.params.id}:`, error);
      ApiResponse.error(res, "Erro ao alterar status do plano", {
        code: "PLAN_STATUS_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Middleware de validação para criação de plano
   */
  public validateCreatePlan = validate(createPlanSchema, ValidateSource.BODY);

  /**
   * Middleware de validação para atualização de plano
   */
  public validateUpdatePlan = validate(updatePlanSchema, ValidateSource.BODY);
}

export const planController = new PlanController();
