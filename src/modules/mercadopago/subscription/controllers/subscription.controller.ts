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
   * @route POST /api/mercadopago/subscription
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
   * @route GET /api/mercadopago/subscription/:id
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
   * @route POST /api/mercadopago/subscription/:id/cancel
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
   * @route GET /api/mercadopago/subscription
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
   * Lista as assinaturas de todos os usuários (apenas para administradores)
   * @route GET /api/mercadopago/subscription/admin/list
   */
  public listAllSubscriptions = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      logger.info("Listando todas as assinaturas (admin)");

      // Busca todas as assinaturas com filtros
      const subscriptions = await prisma.subscription.findMany({
        where: {
          ...(req.query.status && { status: req.query.status as any }),
          ...(req.query.userId && { userId: req.query.userId as string }),
          ...(req.query.planId && { planId: req.query.planId as string }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              personalInfo: {
                select: { name: true, cpf: true },
              },
              companyInfo: {
                select: { companyName: true, cnpj: true },
              },
            },
          },
          plan: true,
          paymentMethod: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Formata a resposta
      const formattedSubscriptions = subscriptions.map((sub) => ({
        id: sub.id,
        status: sub.status,
        startDate: sub.startDate,
        nextBillingDate: sub.nextBillingDate,
        user: {
          id: sub.user.id,
          email: sub.user.email,
          name:
            sub.user.personalInfo?.name ||
            sub.user.companyInfo?.companyName ||
            "N/A",
          document:
            sub.user.personalInfo?.cpf || sub.user.companyInfo?.cnpj || "N/A",
        },
        plan: {
          id: sub.plan.id,
          name: sub.plan.name,
          price: Number(sub.plan.price),
        },
        paymentMethod: sub.paymentMethod.name,
        mpSubscriptionId: sub.mpSubscriptionId,
        createdAt: sub.createdAt,
      }));

      // Sucesso: retorna lista de assinaturas
      ApiResponse.success(res, formattedSubscriptions);
    } catch (error) {
      logger.error("Erro ao listar todas as assinaturas", error);
      throw error;
    }
  };

  /**
   * Verifica se um usuário tem assinatura ativa
   * @route GET /api/mercadopago/subscription/check
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

  /**
   * Atualiza uma assinatura (apenas para administradores)
   * @route POST /api/mercadopago/subscription/admin/:id/update
   */
  public updateSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const subscriptionId = req.params.id;
      const adminId = req.user!.id;
      const { status, nextBillingDate } = req.body;

      logger.info(`Atualizando assinatura ${subscriptionId} (admin)`);

      // Verifica se a assinatura existe
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new ValidationError("Assinatura não encontrada");
      }

      // Atualiza a assinatura
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          ...(status && { status: status as any }),
          ...(nextBillingDate && {
            nextBillingDate: new Date(nextBillingDate),
          }),
          updatedAt: new Date(),
        },
      });

      // Registro de auditoria
      AuditService.log(
        "subscription_admin_update",
        "subscription",
        subscriptionId,
        adminId,
        {
          oldStatus: subscription.status,
          newStatus: status || subscription.status,
        },
        req
      );

      // Sucesso: retorna dados atualizados
      ApiResponse.success(res, updatedSubscription, {
        message: "Assinatura atualizada com sucesso",
      });
    } catch (error) {
      logger.error(`Erro ao atualizar assinatura ${req.params.id}`, error);
      throw error;
    }
  };
}
