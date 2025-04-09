/**
 * Controlador para gerenciamento de assinaturas
 * @module modules/subscription/controllers/subscription.controller
 */

import { Request, Response } from "express";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { SubscriptionService } from "../services/subscription.service";
import { logger } from "@/shared/utils/logger.utils";
import {
  validate,
  ValidateSource,
} from "@/shared/middleware/validate.middleware";
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  subscriptionPaymentSchema,
  initSubscriptionSchema,
} from "../validators/subscription.validators";
import {
  getSubscriptionAdapter,
  getPreferenceAdapter,
  MercadoPagoIntegrationType,
} from "@/modules/mercadopago";
import {
  SubscriptionCheckoutResponseDTO,
  InitSubscriptionDTO,
} from "../dto/subscription.dto";
import { BadRequestError, NotFoundError } from "@/shared/errors/AppError";
import { formatCurrency } from "@/shared/utils/format.utils";
import { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/config/database";

/**
 * Controlador para gerenciamento de assinaturas
 */
export class SubscriptionController {
  private subscriptionService: SubscriptionService;

  /**
   * Inicializa o controlador com os serviços necessários
   */
  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  /**
   * Cria uma nova assinatura
   * @route POST /api/subscription/subscriptions
   */
  public createSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const subscriptionData = req.body;
      const subscription = await this.subscriptionService.createSubscription(
        subscriptionData
      );

      ApiResponse.success(res, subscription, {
        message: "Assinatura criada com sucesso",
        statusCode: 201,
      });
    } catch (error) {
      logger.error("Erro ao criar assinatura:", error);
      ApiResponse.error(res, "Erro ao criar assinatura", {
        code: "SUBSCRIPTION_CREATION_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Inicia o processo de criação de assinatura via MercadoPago
   * @route POST /api/subscription/checkout
   */
  public initCheckout = async (req: Request, res: Response): Promise<void> => {
    try {
      const checkoutData: InitSubscriptionDTO = req.body;

      // Verifica se o usuário existe
      const user = await prisma.user.findUnique({
        where: { id: checkoutData.userId },
        include: {
          personalInfo: true,
          companyInfo: true,
        },
      });

      if (!user) {
        throw new NotFoundError("Usuário não encontrado", "USER_NOT_FOUND");
      }

      // Verifica se o plano existe
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: checkoutData.planId },
      });

      if (!plan) {
        throw new NotFoundError("Plano não encontrado", "PLAN_NOT_FOUND");
      }

      if (!plan.isActive) {
        throw new BadRequestError("Plano não está disponível", "PLAN_INACTIVE");
      }

      // Verifica se o método de pagamento existe
      const paymentMethod = await prisma.paymentMethod.findUnique({
        where: { id: checkoutData.paymentMethodId },
      });

      if (!paymentMethod) {
        throw new NotFoundError(
          "Método de pagamento não encontrado",
          "PAYMENT_METHOD_NOT_FOUND"
        );
      }

      // Configura valores e descontos
      let amount = Number(plan.price);
      let discountAmount = 0;
      let originalAmount = amount;

      // Aplica cupom se fornecido
      if (checkoutData.couponId) {
        const coupon = await prisma.coupon.findUnique({
          where: { id: checkoutData.couponId, status: "ACTIVE" },
        });

        if (!coupon) {
          throw new NotFoundError(
            "Cupom não encontrado ou inativo",
            "COUPON_NOT_FOUND"
          );
        }

        // Verifica se o cupom é válido para este plano
        if (!coupon.appliesToAllPlans) {
          const planRestriction = await prisma.couponPlanRestriction.findUnique(
            {
              where: {
                couponId_planId: {
                  couponId: coupon.id,
                  planId: plan.id,
                },
              },
            }
          );

          if (!planRestriction) {
            throw new BadRequestError(
              "Cupom não válido para este plano",
              "COUPON_NOT_APPLICABLE"
            );
          }
        }

        // Calcula o desconto
        if (coupon.discountType === "PERCENTAGE") {
          discountAmount = amount * (Number(coupon.discountValue) / 100);
        } else {
          discountAmount = Number(coupon.discountValue);
        }

        // Limita ao desconto máximo
        if (
          coupon.maxDiscountAmount &&
          discountAmount > Number(coupon.maxDiscountAmount)
        ) {
          discountAmount = Number(coupon.maxDiscountAmount);
        }

        amount -= discountAmount;
      }

      // Determina o tipo de integração com base no método de pagamento
      const integrationType = MercadoPagoIntegrationType.SUBSCRIPTION;

      // Cria a sessão de checkout no MercadoPago
      const preferenceAdapter = getPreferenceAdapter(integrationType);

      // Formata descrição do plano
      const planDescription = `${plan.name} - ${this.getPlanIntervalText(
        plan
      )}`;

      // Gera ID único para essa transação
      const transactionId = `sub_${Date.now()}_${Math.floor(
        Math.random() * 1000
      )}`;

      // Cria a preferência no MercadoPago
      const preference = await preferenceAdapter.create({
        items: [
          {
            id: plan.id,
            title: `Assinatura ${plan.name}`,
            description: planDescription,
            quantity: 1,
            unit_price: amount,
            currency_id: "BRL",
          },
        ],
        payer: {
          email: checkoutData.email,
          name: user.personalInfo?.name || user.companyInfo?.companyName || "",
          identification: {
            type: user.userType === "PESSOA_FISICA" ? "CPF" : "CNPJ",
            number: user.personalInfo?.cpf || user.companyInfo?.cnpj || "",
          },
        },
        external_reference: transactionId,
        back_urls: {
          success: `${
            checkoutData.backUrl || process.env.FRONTEND_URL
          }/subscription/success`,
          failure: `${
            checkoutData.backUrl || process.env.FRONTEND_URL
          }/subscription/failure`,
          pending: `${
            checkoutData.backUrl || process.env.FRONTEND_URL
          }/subscription/pending`,
        },
        auto_return: "approved",
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 1,
        },
        metadata: {
          user_id: user.id,
          plan_id: plan.id,
          coupon_id: checkoutData.couponId,
          payment_method_id: paymentMethod.id,
          payment_card_id: checkoutData.paymentCardId,
          discount_amount: discountAmount,
          original_amount: originalAmount,
        },
      });

      // Cria a assinatura no sistema (status: PENDING)
      const subscription = await this.subscriptionService.createSubscription({
        userId: user.id,
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        paymentCardId: checkoutData.paymentCardId,
        couponId: checkoutData.couponId,
        startDate: new Date(),
        metadataJson: {
          transactionId,
          preferenceId: preference.id,
          checkoutUrl: preference.init_point,
        },
      });

      // Cria uma sessão de checkout para rastrear
      const checkoutSession = await prisma.checkoutSession.create({
        data: {
          userId: user.id,
          planId: plan.id,
          paymentMethodId: paymentMethod.id,
          status: "pending",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
          mpPreferenceId: preference.id,
          mpInitPoint: preference.init_point,
          mpSandboxInitPoint: preference.sandbox_init_point,
          successUrl: preference.back_urls?.success,
          cancelUrl: preference.back_urls?.failure,
          discountAmount: discountAmount > 0 ? discountAmount : null,
          originalPrice: discountAmount > 0 ? originalAmount : null,
          couponId: checkoutData.couponId,
          metadataJson: {
            transactionId,
            userId: user.id,
            planId: plan.id,
          },
        },
      });

      // Atualiza a assinatura com o ID da sessão de checkout
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { checkoutSessionId: checkoutSession.id },
      });

      // Registra o uso do cupom, se aplicável
      if (checkoutData.couponId && discountAmount > 0) {
        await prisma.couponUsageHistory.create({
          data: {
            couponId: checkoutData.couponId,
            userId: user.id,
            checkoutSessionId: checkoutSession.id,
            discountAmount,
            originalAmount,
          },
        });
      }

      // Retorna os dados necessários para redirecionamento
      const response: SubscriptionCheckoutResponseDTO = {
        checkoutUrl: preference.init_point,
        preferenceId: preference.id,
        subscriptionId: subscription.id,
        expiresAt: checkoutSession.expiresAt,
        testMode: false,
      };

      logger.info(`Checkout de assinatura iniciado: ${subscription.id}`, {
        subscriptionId: subscription.id,
        userId: user.id,
        planId: plan.id,
        preferenceId: preference.id,
        amount,
      });

      ApiResponse.success(res, response, {
        message: "Checkout de assinatura iniciado com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      logger.error("Erro ao iniciar checkout de assinatura:", error);

      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode || "CHECKOUT_ERROR",
          statusCode: error instanceof BadRequestError ? 400 : 404,
        });
      } else {
        ApiResponse.error(res, "Erro ao iniciar checkout de assinatura", {
          code: "SUBSCRIPTION_CHECKOUT_ERROR",
          statusCode: 500,
        });
      }
    }
  };

  /**
   * Atualiza uma assinatura existente
   * @route PUT /api/subscription/subscriptions/:id
   */
  public updateSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const subscriptionData = req.body;

      const updatedSubscription =
        await this.subscriptionService.updateSubscription(id, subscriptionData);

      ApiResponse.success(res, updatedSubscription, {
        message: "Assinatura atualizada com sucesso",
      });
    } catch (error) {
      logger.error(`Erro ao atualizar assinatura ${req.params.id}:`, error);
      ApiResponse.error(res, "Erro ao atualizar assinatura", {
        code: "SUBSCRIPTION_UPDATE_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Cancela uma assinatura
   * @route POST /api/subscription/subscriptions/:id/cancel
   */
  public cancelSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const canceledSubscription =
        await this.subscriptionService.cancelSubscription(id, reason);

      ApiResponse.success(res, canceledSubscription, {
        message: "Assinatura cancelada com sucesso",
      });
    } catch (error) {
      logger.error(`Erro ao cancelar assinatura ${req.params.id}:`, error);
      ApiResponse.error(res, "Erro ao cancelar assinatura", {
        code: "SUBSCRIPTION_CANCELLATION_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Pausa uma assinatura
   * @route POST /api/subscription/subscriptions/:id/pause
   */
  public pauseSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const pausedSubscription =
        await this.subscriptionService.pauseSubscription(id);

      ApiResponse.success(res, pausedSubscription, {
        message: "Assinatura pausada com sucesso",
      });
    } catch (error) {
      logger.error(`Erro ao pausar assinatura ${req.params.id}:`, error);
      ApiResponse.error(res, "Erro ao pausar assinatura", {
        code: "SUBSCRIPTION_PAUSE_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Retoma uma assinatura pausada
   * @route POST /api/subscription/subscriptions/:id/resume
   */
  public resumeSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const resumedSubscription =
        await this.subscriptionService.resumeSubscription(id);

      ApiResponse.success(res, resumedSubscription, {
        message: "Assinatura retomada com sucesso",
      });
    } catch (error) {
      logger.error(`Erro ao retomar assinatura ${req.params.id}:`, error);
      ApiResponse.error(res, "Erro ao retomar assinatura", {
        code: "SUBSCRIPTION_RESUME_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Renova manualmente uma assinatura
   * @route POST /api/subscription/subscriptions/:id/renew
   */
  public renewSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const renewalInfo = await this.subscriptionService.renewSubscription(id);

      if (renewalInfo.success) {
        ApiResponse.success(res, renewalInfo, {
          message: "Assinatura renovada com sucesso",
        });
      } else {
        ApiResponse.error(
          res,
          `Falha ao renovar assinatura: ${renewalInfo.error}`,
          {
            code: "SUBSCRIPTION_RENEWAL_FAILED",
            statusCode: 400,
            meta: {
              subscription: renewalInfo.subscription,
              newStatus: renewalInfo.newStatus,
            },
          }
        );
      }
    } catch (error) {
      logger.error(`Erro ao renovar assinatura ${req.params.id}:`, error);
      ApiResponse.error(res, "Erro ao renovar assinatura", {
        code: "SUBSCRIPTION_RENEWAL_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Obtém uma assinatura pelo ID
   * @route GET /api/subscription/subscriptions/:id
   */
  public getSubscriptionById = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const subscription = await this.subscriptionService.getSubscriptionById(
        id
      );

      if (!subscription) {
        ApiResponse.error(res, "Assinatura não encontrada", {
          code: "SUBSCRIPTION_NOT_FOUND",
          statusCode: 404,
        });
        return;
      }

      // Verifica permissão (apenas admin ou dono da assinatura)
      const isAdmin =
        req.user?.role === "ADMIN" ||
        req.user?.role === "Super Administrador" ||
        req.user?.role === "Financeiro";

      if (!isAdmin && req.user?.id !== subscription.userId) {
        ApiResponse.error(
          res,
          "Você não tem permissão para acessar esta assinatura",
          {
            code: "SUBSCRIPTION_ACCESS_DENIED",
            statusCode: 403,
          }
        );
        return;
      }

      ApiResponse.success(res, subscription);
    } catch (error) {
      logger.error(`Erro ao buscar assinatura ${req.params.id}:`, error);
      ApiResponse.error(res, "Erro ao buscar assinatura", {
        code: "SUBSCRIPTION_FETCH_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Lista assinaturas do usuário atual
   * @route GET /api/subscription/my-subscriptions
   */
  public getMySubscriptions = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        ApiResponse.error(res, "Usuário não autenticado", {
          code: "UNAUTHORIZED",
          statusCode: 401,
        });
        return;
      }

      const subscriptions =
        await this.subscriptionService.getSubscriptionsByUserId(userId);

      ApiResponse.success(res, subscriptions);
    } catch (error) {
      logger.error("Erro ao listar assinaturas do usuário:", error);
      ApiResponse.error(res, "Erro ao listar assinaturas", {
        code: "SUBSCRIPTIONS_FETCH_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Lista métodos de pagamento disponíveis
   * @route GET /api/subscription/payment-methods
   */
  public getPaymentMethods = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const paymentMethods =
        await this.subscriptionService.getAvailablePaymentMethods();

      ApiResponse.success(res, paymentMethods);
    } catch (error) {
      logger.error("Erro ao listar métodos de pagamento:", error);
      ApiResponse.error(res, "Erro ao listar métodos de pagamento", {
        code: "PAYMENT_METHODS_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Obtém texto descritivo do intervalo do plano
   */
  private getPlanIntervalText(plan: any): string {
    const count = plan.intervalCount || 1;

    switch (plan.interval) {
      case "MONTHLY":
        return count === 1 ? "Mensal" : `a cada ${count} meses`;
      case "QUARTERLY":
        return count === 1 ? "Trimestral" : `a cada ${count * 3} meses`;
      case "SEMIANNUAL":
        return count === 1 ? "Semestral" : `a cada ${count * 6} meses`;
      case "ANNUAL":
        return count === 1 ? "Anual" : `a cada ${count} anos`;
      default:
        return "Assinatura";
    }
  }

  /**
   * Middleware de validação para criação de assinatura
   */
  public validateCreateSubscription = validate(
    createSubscriptionSchema,
    ValidateSource.BODY
  );

  /**
   * Middleware de validação para atualização de assinatura
   */
  public validateUpdateSubscription = validate(
    updateSubscriptionSchema,
    ValidateSource.BODY
  );

  /**
   * Middleware de validação para iniciar checkout
   */
  public validateInitCheckout = validate(
    initSubscriptionSchema,
    ValidateSource.BODY
  );

  /**
   * Middleware de validação para processamento de pagamento
   */
  public validatePayment = validate(
    subscriptionPaymentSchema,
    ValidateSource.BODY
  );
}

// Instância do controlador para exportação
export const subscriptionController = new SubscriptionController();
