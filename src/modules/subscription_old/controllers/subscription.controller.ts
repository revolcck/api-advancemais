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
  getPreferenceAdapter,
  getPaymentAdapter,
  MercadoPagoIntegrationType,
} from "@/modules/mercadopago";
import {
  SubscriptionCheckoutResponseDTO,
  InitSubscriptionDTO,
} from "../dto/subscription.dto";
import { AppError } from "@/shared/errors/AppError";
import { prisma } from "@/config/database";
import { PaymentStatus, SubscriptionStatus } from "@prisma/client";

// Classe customizada para erros de requisição inválida
class BadRequestError extends AppError {
  constructor(message: string, errorCode: string, meta?: Record<string, any>) {
    super(message, 400, errorCode, meta);
  }
}

// Classe customizada para erros de recurso não encontrado
class NotFoundError extends AppError {
  constructor(message: string, errorCode: string, meta?: Record<string, any>) {
    super(message, 404, errorCode, meta);
  }
}

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

      // Aplica as restrições de método de pagamento
      const paymentRestrictions =
        this.getPaymentMethodRestrictions(paymentMethod);

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
          excluded_payment_methods:
            paymentRestrictions.excluded_payment_methods,
          excluded_payment_types: paymentRestrictions.excluded_payment_types,
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

      if (
        error instanceof BadRequestError ||
        error instanceof NotFoundError ||
        error instanceof AppError
      ) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode || "CHECKOUT_ERROR",
          statusCode: error instanceof NotFoundError ? 404 : 400,
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
   * Verifica o status da assinatura do usuário atual
   * @route GET /api/subscription/status
   */
  public checkSubscriptionStatus = async (
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

      // Busca a assinatura ativa do usuário
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: SubscriptionStatus.ACTIVE,
        },
        include: {
          plan: true,
          payments: {
            orderBy: { paymentDate: "desc" },
            take: 1,
          },
        },
      });

      // Se não tem assinatura ativa, verifica se tem assinatura pendente
      if (!subscription) {
        const pendingSubscription = await prisma.subscription.findFirst({
          where: {
            userId,
            status: SubscriptionStatus.PENDING,
          },
          include: {
            plan: true,
            checkoutSession: true,
          },
        });

        if (pendingSubscription) {
          ApiResponse.success(
            res,
            {
              hasActiveSubscription: false,
              hasPendingSubscription: true,
              subscription: {
                id: pendingSubscription.id,
                status: pendingSubscription.status,
                planName: pendingSubscription.plan.name,
                checkoutUrl: pendingSubscription.checkoutSession?.mpInitPoint,
                expiresAt: pendingSubscription.checkoutSession?.expiresAt,
              },
            },
            {
              message: "Você tem uma assinatura pendente de pagamento",
            }
          );
          return;
        }

        // Sem assinaturas
        ApiResponse.success(
          res,
          {
            hasActiveSubscription: false,
            hasPendingSubscription: false,
            subscription: null,
          },
          {
            message: "Você não possui assinatura ativa",
          }
        );
        return;
      }

      // Tem assinatura ativa, verifica se está pausada
      if (subscription.isPaused) {
        ApiResponse.success(
          res,
          {
            hasActiveSubscription: true,
            isPaused: true,
            subscription: {
              id: subscription.id,
              status: subscription.status,
              planName: subscription.plan.name,
              features: subscription.plan.features,
              nextBillingDate: subscription.nextBillingDate,
              pausedAt: subscription.pausedAt,
            },
          },
          {
            message: "Sua assinatura está pausada",
          }
        );
        return;
      }

      // Assinatura ativa e não pausada
      ApiResponse.success(res, {
        hasActiveSubscription: true,
        isPaused: false,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          planName: subscription.plan.name,
          features: subscription.plan.features,
          nextBillingDate: subscription.nextBillingDate,
          jobOffers: {
            max: subscription.plan.maxJobOffers,
            used: subscription.usedJobOffers,
            remaining:
              (subscription.plan.maxJobOffers || 0) -
              (subscription.usedJobOffers || 0),
          },
          currentPeriod: {
            start: subscription.currentPeriodStart,
            end: subscription.currentPeriodEnd,
          },
          lastPayment: subscription.payments[0] || null,
        },
      });
    } catch (error) {
      logger.error("Erro ao verificar status da assinatura:", error);
      ApiResponse.error(res, "Erro ao verificar status da assinatura", {
        code: "SUBSCRIPTION_STATUS_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Sincroniza o status da assinatura com o Mercado Pago
   * @route POST /api/subscription/sync/:id
   */
  public syncSubscriptionStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;

      // Verifica se a assinatura existe
      const subscription = await prisma.subscription.findUnique({
        where: { id },
        include: { user: true, plan: true },
      });

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

      // Se tiver ID de assinatura do MercadoPago, sincroniza com a API
      if (subscription.mpSubscriptionId) {
        const updatedSubscription =
          await this.subscriptionService.updateSubscriptionFromMercadoPago(
            subscription.mpSubscriptionId
          );

        if (updatedSubscription) {
          ApiResponse.success(res, updatedSubscription, {
            message: "Assinatura sincronizada com sucesso",
          });
        } else {
          ApiResponse.error(
            res,
            "Não foi possível sincronizar com o Mercado Pago",
            {
              code: "SYNC_FAILED",
              statusCode: 400,
            }
          );
        }
        return;
      }

      // Se tiver checkoutSession, verifica status da preferência
      if (subscription.checkoutSessionId) {
        const checkoutSession = await prisma.checkoutSession.findUnique({
          where: { id: subscription.checkoutSessionId },
        });

        if (
          checkoutSession &&
          checkoutSession.mpPreferenceId &&
          checkoutSession.status === "pending"
        ) {
          try {
            // Busca a preferência no Mercado Pago
            const preferenceAdapter = getPreferenceAdapter(
              MercadoPagoIntegrationType.SUBSCRIPTION
            );
            const preference = await preferenceAdapter.get(
              checkoutSession.mpPreferenceId
            );

            // Verifica se tem payments associados a esta preferência
            if (preference && preference.id) {
              // Busca pagamentos associados a esta preferência
              const paymentAdapter = getPaymentAdapter(
                MercadoPagoIntegrationType.SUBSCRIPTION
              );
              const payments = await paymentAdapter.search({
                preference_id: preference.id,
              });

              if (payments && payments.results && payments.results.length > 0) {
                // Encontrou pagamentos - processa o mais recente
                const latestPayment = payments.results[0];

                // Determina o status baseado no pagamento
                let newStatus = subscription.status;
                if (latestPayment.status === "approved") {
                  newStatus = SubscriptionStatus.ACTIVE;
                } else if (
                  ["rejected", "cancelled"].includes(latestPayment.status)
                ) {
                  newStatus = SubscriptionStatus.PAYMENT_FAILED;
                }

                // Registra o pagamento no sistema
                await this.subscriptionService.processPayment({
                  subscriptionId: subscription.id,
                  amount: latestPayment.transaction_amount,
                  status:
                    latestPayment.status === "approved"
                      ? PaymentStatus.APPROVED
                      : PaymentStatus.REJECTED,
                  description: `Pagamento via MercadoPago - ${latestPayment.id}`,
                  paymentDate: new Date(latestPayment.date_created),
                  mpPaymentId: latestPayment.id.toString(),
                  mpPreferenceId: preference.id,
                  mpStatus: latestPayment.status,
                  mpStatusDetail: latestPayment.status_detail,
                  gatewayResponse: latestPayment,
                });

                // Atualiza o status da assinatura
                const updatedSubscription =
                  await this.subscriptionService.updateSubscription(
                    subscription.id,
                    {
                      status: newStatus,
                    }
                  );

                ApiResponse.success(res, updatedSubscription, {
                  message: `Assinatura atualizada com base no pagamento: ${latestPayment.status}`,
                });
                return;
              }
            }

            // Se não encontrou pagamentos
            ApiResponse.success(res, subscription, {
              message: "Nenhum pagamento encontrado para esta assinatura",
            });
          } catch (error) {
            logger.error(
              `Erro ao sincronizar preferência ${checkoutSession.mpPreferenceId}:`,
              error
            );
            ApiResponse.error(res, "Erro ao sincronizar com o Mercado Pago", {
              code: "SYNC_ERROR",
              statusCode: 500,
            });
          }
          return;
        }
      }

      // Se chegou aqui, não tem como sincronizar
      ApiResponse.success(res, subscription, {
        message: "Assinatura sem referência externa para sincronização",
      });
    } catch (error) {
      logger.error(`Erro ao sincronizar assinatura:`, error);
      ApiResponse.error(res, "Erro ao sincronizar assinatura", {
        code: "SYNC_ERROR",
        statusCode: 500,
      });
    }
  };

  /**
   * Função auxiliar para determinar quais métodos de pagamento excluir no checkout
   * @param paymentMethod Método de pagamento selecionado pelo usuário
   * @returns Configuração de restrições para o Mercado Pago
   */
  private getPaymentMethodRestrictions(paymentMethod: any): {
    excluded_payment_methods: Array<{ id: string }>;
    excluded_payment_types: Array<{ id: string }>;
  } {
    // Arrays para armazenar métodos e tipos de pagamento a serem excluídos
    const excludedPaymentMethods: Array<{ id: string }> = [];
    const excludedPaymentTypes: Array<{ id: string }> = [];

    // Se o usuário selecionou checkout completo do MP, não excluímos nada
    if (paymentMethod.type === "MP_CHECKOUT") {
      return { excluded_payment_methods: [], excluded_payment_types: [] };
    }

    // Mapeamento entre os tipos de pagamento do nosso sistema e do Mercado Pago
    const mpPaymentTypeMap: Record<string, string> = {
      CREDIT_CARD: "credit_card",
      DEBIT_CARD: "debit_card",
      PIX: "pix",
      BANK_SLIP: "ticket",
      BANK_TRANSFER: "bank_transfer",
    };

    // Obtém o tipo equivalente no Mercado Pago
    const selectedType = mpPaymentTypeMap[paymentMethod.type];

    // Se for um tipo válido, excluímos todos os outros tipos
    if (selectedType) {
      // Excluir todos os tipos EXCETO o selecionado
      Object.entries(mpPaymentTypeMap).forEach(([key, value]) => {
        if (value && value !== selectedType) {
          excludedPaymentTypes.push({ id: value });
        }
      });
    }

    // Se temos informações específicas de IDs de métodos de pagamento do MP
    if (
      paymentMethod.mpPaymentMethodId &&
      paymentMethod.type === "CREDIT_CARD"
    ) {
      // Em caso de cartão de crédito, podemos restringir a bandeiras específicas
      // Essa parte depende de como você armazena esses IDs no seu sistema
      const creditCardMethods = [
        "visa",
        "master",
        "amex",
        "elo",
        "hipercard",
        "diners",
      ];

      creditCardMethods.forEach((method) => {
        if (method !== paymentMethod.mpPaymentMethodId) {
          excludedPaymentMethods.push({ id: method });
        }
      });
    }

    return {
      excluded_payment_methods: excludedPaymentMethods,
      excluded_payment_types: excludedPaymentTypes,
    };
  }

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
