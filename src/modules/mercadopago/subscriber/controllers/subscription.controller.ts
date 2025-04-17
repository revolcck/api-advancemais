import { Request, Response } from "express";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { logger } from "@/shared/utils/logger.utils";
import { SubscriptionService } from "../services/subscription.service";
import { AuditService } from "@/shared/services/audit.service";
import { prisma } from "@/config/database";
import { ValidationError } from "@/shared/errors/AppError";

/**
 * Controlador para operações de assinatura com MercadoPago
 */
export class SubscriptionController {
  private subscriptionService: SubscriptionService;

  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  /**
   * Cria uma nova assinatura
   * @route POST /api/mercadopago/subscriber
   */
  public createSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      logger.info("Iniciando criação de assinatura");

      // O usuário já foi autenticado pelo middleware
      const userId = req.user!.id;
      const { planId, ...subscriptionData } = req.body;

      // Valida o plano de assinatura
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new ValidationError("Plano de assinatura não encontrado");
      }

      if (!plan.isActive) {
        throw new ValidationError("Plano de assinatura indisponível");
      }

      // Cria a assinatura
      const subscription = await this.subscriptionService.createSubscription(
        planId,
        userId,
        subscriptionData
      );

      // Registra ação de auditoria
      AuditService.log(
        "subscription_initiated",
        "subscription",
        subscription.subscriptionId,
        userId,
        {
          planId,
          amount: plan.price,
          mpSubscriptionId: subscription.mpSubscriptionId,
        },
        req
      );

      // Sucesso: retorna dados da assinatura
      ApiResponse.success(res, subscription, {
        message: "Assinatura criada com sucesso",
        statusCode: 201,
      });
    } catch (error) {
      logger.error("Erro ao criar assinatura", error);
      throw error;
    }
  };

  /**
   * Obtém detalhes de uma assinatura
   * @route GET /api/mercadopago/subscriber/:id
   */
  public getSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const subscriptionId = req.params.id;
      const userId = req.user!.id;

      logger.info(
        `Buscando assinatura ${subscriptionId} para usuário ${userId}`
      );

      // Busca detalhes da assinatura
      const subscription =
        await this.subscriptionService.getSubscriptionDetails(
          subscriptionId,
          userId
        );

      // Sucesso: retorna dados da assinatura
      ApiResponse.success(res, subscription);
    } catch (error) {
      logger.error(`Erro ao obter detalhes da assinatura`, error);
      throw error;
    }
  };

  /**
   * Cancela uma assinatura
   * @route POST /api/mercadopago/subscriber/:id/cancel
   */
  public cancelSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const subscriptionId = req.params.id;
      const userId = req.user!.id;
      const { reason } = req.body;

      logger.info(
        `Cancelando assinatura ${subscriptionId} para usuário ${userId}`
      );

      // Cancela a assinatura
      const result = await this.subscriptionService.cancelSubscription(
        subscriptionId,
        userId,
        reason
      );

      // Sucesso: retorna confirmação
      ApiResponse.success(
        res,
        { canceled: true },
        {
          message: result.message,
        }
      );
    } catch (error) {
      logger.error(`Erro ao cancelar assinatura ${req.params.id}`, error);
      throw error;
    }
  };

  /**
   * Lista as assinaturas de um usuário
   * @route GET /api/mercadopago/subscriber
   */
  public listSubscriptions = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user!.id;

      logger.info(`Listando assinaturas para usuário ${userId}`);

      // Busca as assinaturas do usuário
      const subscriptions =
        await this.subscriptionService.listUserSubscriptions(
          userId,
          req.query.status as string
        );

      // Sucesso: retorna lista de assinaturas
      ApiResponse.success(res, subscriptions);
    } catch (error) {
      logger.error("Erro ao listar assinaturas", error);
      throw error;
    }
  };

  /**
   * Verifica se um usuário tem assinatura ativa
   * @route GET /api/mercadopago/subscriber/check
   */
  public checkActiveSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user!.id;

      logger.info(`Verificando assinatura ativa para usuário ${userId}`);

      // Verifica assinatura ativa
      const activeSubscription =
        await this.subscriptionService.checkActiveSubscription(userId);

      // Sucesso: retorna status da assinatura
      ApiResponse.success(res, activeSubscription);
    } catch (error) {
      logger.error("Erro ao verificar assinatura ativa", error);
      throw error;
    }
  };
}
