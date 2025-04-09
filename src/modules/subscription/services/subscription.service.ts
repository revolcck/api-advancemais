/**
 * Serviço para gerenciamento de assinaturas
 * @module modules/subscription/services/subscription.service
 */

import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  Subscription,
  SubscriptionStatus,
} from "@prisma/client";
import { prisma } from "@/config/database";
import { logger } from "@/shared/utils/logger.utils";
import { BadRequestError, NotFoundError } from "@/shared/errors/AppError";
import {
  ICreateSubscriptionDTO,
  ISubscriptionPaymentDTO,
  ISubscriptionService,
  IRenewalInfo,
  IUpdateSubscriptionDTO,
} from "../interfaces/subscription.interface";
import {
  getSubscriptionAdapter,
  getMerchantOrderAdapter,
  getPaymentAdapter,
  MercadoPagoIntegrationType,
} from "@/modules/mercadopago";
import { addDays, addMonths, format } from "date-fns";

/**
 * Implementação do serviço de assinaturas
 */
export class SubscriptionService implements ISubscriptionService {
  /**
   * Cria uma nova assinatura
   * @param data Dados da assinatura
   * @returns Assinatura criada
   */
  public async createSubscription(
    data: ICreateSubscriptionDTO
  ): Promise<Subscription> {
    try {
      // Verifica se o usuário existe
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
      });

      if (!user) {
        throw new NotFoundError("Usuário não encontrado", "USER_NOT_FOUND");
      }

      // Verifica se o plano existe e está ativo
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: data.planId },
      });

      if (!plan) {
        throw new NotFoundError("Plano não encontrado", "PLAN_NOT_FOUND");
      }

      if (!plan.isActive) {
        throw new BadRequestError(
          "O plano selecionado não está disponível",
          "PLAN_INACTIVE"
        );
      }

      // Verifica se o método de pagamento existe
      const paymentMethod = await prisma.paymentMethod.findUnique({
        where: { id: data.paymentMethodId },
      });

      if (!paymentMethod) {
        throw new NotFoundError(
          "Método de pagamento não encontrado",
          "PAYMENT_METHOD_NOT_FOUND"
        );
      }

      // Verifica se o cartão existe, se for fornecido
      if (data.paymentCardId) {
        const paymentCard = await prisma.paymentCard.findUnique({
          where: {
            id: data.paymentCardId,
            userId: data.userId,
          },
        });

        if (!paymentCard) {
          throw new NotFoundError(
            "Cartão de pagamento não encontrado",
            "PAYMENT_CARD_NOT_FOUND"
          );
        }
      }

      // Verifica se o cupom existe, se for fornecido
      let discountAmount = 0;
      let originalPrice = plan.price;

      if (data.couponId) {
        const coupon = await prisma.coupon.findUnique({
          where: { id: data.couponId, status: "ACTIVE" },
        });

        if (!coupon) {
          throw new NotFoundError(
            "Cupom não encontrado ou inativo",
            "COUPON_NOT_FOUND"
          );
        }

        // Verifica se o cupom aplica-se a este plano
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
              "O cupom não é válido para este plano",
              "COUPON_NOT_APPLICABLE"
            );
          }
        }

        // Calcula o desconto
        if (coupon.discountType === "PERCENTAGE") {
          discountAmount =
            Number(plan.price) * (Number(coupon.discountValue) / 100);
        } else {
          discountAmount = Number(coupon.discountValue);
        }

        // Garante que o desconto não exceda o valor máximo definido
        if (
          coupon.maxDiscountAmount &&
          discountAmount > Number(coupon.maxDiscountAmount)
        ) {
          discountAmount = Number(coupon.maxDiscountAmount);
        }
      }

      // Define as datas de início e próxima cobrança
      const startDate = data.startDate || new Date();
      let nextBillingDate: Date;

      // Calcula próxima data de cobrança baseado no intervalo do plano
      switch (plan.interval) {
        case "MONTHLY":
          nextBillingDate = addMonths(startDate, plan.intervalCount);
          break;
        case "QUARTERLY":
          nextBillingDate = addMonths(startDate, 3 * plan.intervalCount);
          break;
        case "SEMIANNUAL":
          nextBillingDate = addMonths(startDate, 6 * plan.intervalCount);
          break;
        case "ANNUAL":
          nextBillingDate = addMonths(startDate, 12 * plan.intervalCount);
          break;
        default:
          nextBillingDate = addMonths(startDate, 1);
      }

      // Cria a assinatura
      const subscription = await prisma.subscription.create({
        data: {
          userId: data.userId,
          planId: data.planId,
          paymentMethodId: data.paymentMethodId,
          paymentCardId: data.paymentCardId,
          couponId: data.couponId,
          status: SubscriptionStatus.PENDING,
          startDate,
          nextBillingDate,
          currentPeriodStart: startDate,
          currentPeriodEnd: nextBillingDate,
          mpSubscriptionId: data.mpSubscriptionId,
          mpPreapprovalId: data.mpPreapprovalId,
          discountAmount: discountAmount > 0 ? discountAmount : null,
          originalPrice: discountAmount > 0 ? originalPrice : null,
          metadataJson: data.metadataJson as any,
        },
        include: {
          plan: true,
          user: true,
          paymentMethod: true,
          paymentCard: true,
          coupon: true,
        },
      });

      // Registra o uso do cupom, se aplicável
      if (data.couponId && discountAmount > 0) {
        await prisma.couponUsageHistory.create({
          data: {
            couponId: data.couponId,
            userId: data.userId,
            subscriptionId: subscription.id,
            discountAmount,
            originalAmount: Number(originalPrice),
          },
        });

        // Incrementa o contador de uso do cupom
        await prisma.coupon.update({
          where: { id: data.couponId },
          data: {
            usageCount: { increment: 1 },
            totalDiscountAmount: { increment: discountAmount },
          },
        });
      }

      logger.info(`Assinatura criada com sucesso: ${subscription.id}`, {
        subscriptionId: subscription.id,
        userId: data.userId,
        planId: data.planId,
        plan: plan.name,
        status: subscription.status,
      });

      return subscription;
    } catch (error) {
      logger.error("Erro ao criar assinatura:", error);
      throw error;
    }
  }

  /**
   * Obtém uma assinatura pelo ID
   * @param id ID da assinatura
   * @returns Assinatura encontrada ou null
   */
  public async getSubscriptionById(id: string): Promise<Subscription | null> {
    try {
      return await prisma.subscription.findUnique({
        where: { id },
        include: {
          plan: true,
          user: {
            select: {
              id: true,
              email: true,
              userType: true,
              isActive: true,
              personalInfo: true,
              companyInfo: true,
            },
          },
          paymentMethod: true,
          paymentCard: true,
          coupon: true,
          payments: {
            orderBy: { paymentDate: "desc" },
            take: 5,
          },
        },
      });
    } catch (error) {
      logger.error(`Erro ao buscar assinatura ${id}:`, error);
      throw error;
    }
  }

  /**
   * Obtém todas as assinaturas de um usuário
   * @param userId ID do usuário
   * @returns Lista de assinaturas
   */
  public async getSubscriptionsByUserId(
    userId: string
  ): Promise<Subscription[]> {
    try {
      return await prisma.subscription.findMany({
        where: { userId },
        include: {
          plan: true,
          paymentMethod: true,
          paymentCard: true,
          coupon: true,
          payments: {
            orderBy: { paymentDate: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      logger.error(`Erro ao buscar assinaturas do usuário ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Atualiza uma assinatura existente
   * @param id ID da assinatura
   * @param data Dados a serem atualizados
   * @returns Assinatura atualizada
   */
  public async updateSubscription(
    id: string,
    data: IUpdateSubscriptionDTO
  ): Promise<Subscription> {
    try {
      // Verifica se a assinatura existe
      const subscription = await prisma.subscription.findUnique({
        where: { id },
      });

      if (!subscription) {
        throw new NotFoundError(
          "Assinatura não encontrada",
          "SUBSCRIPTION_NOT_FOUND"
        );
      }

      // Verifica se o método de pagamento existe, se fornecido
      if (data.paymentMethodId) {
        const paymentMethod = await prisma.paymentMethod.findUnique({
          where: { id: data.paymentMethodId },
        });

        if (!paymentMethod) {
          throw new NotFoundError(
            "Método de pagamento não encontrado",
            "PAYMENT_METHOD_NOT_FOUND"
          );
        }
      }

      // Verifica se o cartão existe, se fornecido
      if (data.paymentCardId) {
        const paymentCard = await prisma.paymentCard.findUnique({
          where: { id: data.paymentCardId },
        });

        if (!paymentCard) {
          throw new NotFoundError(
            "Cartão de pagamento não encontrado",
            "PAYMENT_CARD_NOT_FOUND"
          );
        }
      }

      // Atualiza a assinatura
      const updatedSubscription = await prisma.subscription.update({
        where: { id },
        data: {
          ...(data.status !== undefined && { status: data.status }),
          ...(data.paymentMethodId && {
            paymentMethodId: data.paymentMethodId,
          }),
          ...(data.paymentCardId !== undefined && {
            paymentCardId: data.paymentCardId,
          }),
          ...(data.nextBillingDate && {
            nextBillingDate: data.nextBillingDate,
          }),
          ...(data.canceledAt !== undefined && { canceledAt: data.canceledAt }),
          ...(data.cancelReason !== undefined && {
            cancelReason: data.cancelReason,
          }),
          ...(data.isPaused !== undefined && { isPaused: data.isPaused }),
          ...(data.pausedAt !== undefined && { pausedAt: data.pausedAt }),
          ...(data.mpSubscriptionId !== undefined && {
            mpSubscriptionId: data.mpSubscriptionId,
          }),
          ...(data.mpPreapprovalId !== undefined && {
            mpPreapprovalId: data.mpPreapprovalId,
          }),
          ...(data.mpMerchantOrderId !== undefined && {
            mpMerchantOrderId: data.mpMerchantOrderId,
          }),
          ...(data.metadataJson !== undefined && {
            metadataJson: data.metadataJson as any,
          }),
        },
        include: {
          plan: true,
          user: true,
          paymentMethod: true,
          paymentCard: true,
        },
      });

      logger.info(`Assinatura atualizada: ${id}`, {
        subscriptionId: id,
        userId: updatedSubscription.userId,
        planId: updatedSubscription.planId,
        status: updatedSubscription.status,
      });

      return updatedSubscription;
    } catch (error) {
      logger.error(`Erro ao atualizar assinatura ${id}:`, error);
      throw error;
    }
  }

  /**
   * Cancela uma assinatura
   * @param id ID da assinatura
   * @param reason Motivo do cancelamento (opcional)
   * @returns Assinatura cancelada
   */
  public async cancelSubscription(
    id: string,
    reason?: string
  ): Promise<Subscription> {
    try {
      // Verifica se a assinatura existe
      const subscription = await prisma.subscription.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true, email: true },
          },
          plan: true,
        },
      });

      if (!subscription) {
        throw new NotFoundError(
          "Assinatura não encontrada",
          "SUBSCRIPTION_NOT_FOUND"
        );
      }

      // Verifica se a assinatura já está cancelada
      if (subscription.status === SubscriptionStatus.CANCELED) {
        throw new BadRequestError(
          "Assinatura já está cancelada",
          "SUBSCRIPTION_ALREADY_CANCELED"
        );
      }

      // Tenta cancelar no MercadoPago, se houver ID
      if (subscription.mpSubscriptionId) {
        try {
          const subscriptionAdapter = getSubscriptionAdapter();
          await subscriptionAdapter.update(subscription.mpSubscriptionId, {
            status: "cancelled",
          });

          logger.info(
            `Assinatura cancelada no MercadoPago: ${subscription.mpSubscriptionId}`,
            {
              subscriptionId: id,
              mpSubscriptionId: subscription.mpSubscriptionId,
            }
          );
        } catch (mpError) {
          // Apenas loga o erro, mas continua o cancelamento localmente
          logger.error(
            `Erro ao cancelar assinatura no MercadoPago: ${subscription.mpSubscriptionId}`,
            mpError
          );
        }
      }

      // Atualiza a assinatura no banco de dados
      const canceledSubscription = await prisma.subscription.update({
        where: { id },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
          cancelReason: reason || "Cancelamento solicitado pelo usuário",
        },
      });

      logger.info(`Assinatura cancelada: ${id}`, {
        subscriptionId: id,
        userId: subscription.userId,
        planId: subscription.planId,
        reason: reason || "Cancelamento solicitado pelo usuário",
      });

      return canceledSubscription;
    } catch (error) {
      logger.error(`Erro ao cancelar assinatura ${id}:`, error);
      throw error;
    }
  }

  /**
   * Pausa uma assinatura
   * @param id ID da assinatura
   * @returns Assinatura pausada
   */
  public async pauseSubscription(id: string): Promise<Subscription> {
    try {
      // Verifica se a assinatura existe
      const subscription = await prisma.subscription.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true, email: true },
          },
          plan: true,
        },
      });

      if (!subscription) {
        throw new NotFoundError(
          "Assinatura não encontrada",
          "SUBSCRIPTION_NOT_FOUND"
        );
      }

      // Verifica se a assinatura está em um estado válido para pausar
      if (subscription.status !== SubscriptionStatus.ACTIVE) {
        throw new BadRequestError(
          "Apenas assinaturas ativas podem ser pausadas",
          "INVALID_SUBSCRIPTION_STATUS"
        );
      }

      if (subscription.isPaused) {
        throw new BadRequestError(
          "Assinatura já está pausada",
          "SUBSCRIPTION_ALREADY_PAUSED"
        );
      }

      // Tenta pausar no MercadoPago, se houver ID
      if (subscription.mpSubscriptionId) {
        try {
          const subscriptionAdapter = getSubscriptionAdapter();
          await subscriptionAdapter.update(subscription.mpSubscriptionId, {
            status: "paused",
          });

          logger.info(
            `Assinatura pausada no MercadoPago: ${subscription.mpSubscriptionId}`,
            {
              subscriptionId: id,
              mpSubscriptionId: subscription.mpSubscriptionId,
            }
          );
        } catch (mpError) {
          // Apenas loga o erro, mas continua a pausa localmente
          logger.error(
            `Erro ao pausar assinatura no MercadoPago: ${subscription.mpSubscriptionId}`,
            mpError
          );
        }
      }

      // Atualiza a assinatura no banco de dados
      const pausedSubscription = await prisma.subscription.update({
        where: { id },
        data: {
          isPaused: true,
          pausedAt: new Date(),
        },
      });

      logger.info(`Assinatura pausada: ${id}`, {
        subscriptionId: id,
        userId: subscription.userId,
        planId: subscription.planId,
      });

      return pausedSubscription;
    } catch (error) {
      logger.error(`Erro ao pausar assinatura ${id}:`, error);
      throw error;
    }
  }

  /**
   * Retoma uma assinatura pausada
   * @param id ID da assinatura
   * @returns Assinatura retomada
   */
  public async resumeSubscription(id: string): Promise<Subscription> {
    try {
      // Verifica se a assinatura existe
      const subscription = await prisma.subscription.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true, email: true },
          },
          plan: true,
        },
      });

      if (!subscription) {
        throw new NotFoundError(
          "Assinatura não encontrada",
          "SUBSCRIPTION_NOT_FOUND"
        );
      }

      // Verifica se a assinatura está pausada
      if (!subscription.isPaused) {
        throw new BadRequestError(
          "Assinatura não está pausada",
          "SUBSCRIPTION_NOT_PAUSED"
        );
      }

      // Tenta retomar no MercadoPago, se houver ID
      if (subscription.mpSubscriptionId) {
        try {
          const subscriptionAdapter = getSubscriptionAdapter();
          await subscriptionAdapter.update(subscription.mpSubscriptionId, {
            status: "authorized",
          });

          logger.info(
            `Assinatura retomada no MercadoPago: ${subscription.mpSubscriptionId}`,
            {
              subscriptionId: id,
              mpSubscriptionId: subscription.mpSubscriptionId,
            }
          );
        } catch (mpError) {
          // Apenas loga o erro, mas continua a retomada localmente
          logger.error(
            `Erro ao retomar assinatura no MercadoPago: ${subscription.mpSubscriptionId}`,
            mpError
          );
        }
      }

      // Atualiza a assinatura no banco de dados
      const resumedSubscription = await prisma.subscription.update({
        where: { id },
        data: {
          isPaused: false,
          pausedAt: null,
        },
      });

      logger.info(`Assinatura retomada: ${id}`, {
        subscriptionId: id,
        userId: subscription.userId,
        planId: subscription.planId,
      });

      return resumedSubscription;
    } catch (error) {
      logger.error(`Erro ao retomar assinatura ${id}:`, error);
      throw error;
    }
  }

  /**
   * Renova uma assinatura
   * @param subscriptionId ID da assinatura a ser renovada
   * @returns Informações da renovação
   */
  public async renewSubscription(
    subscriptionId: string
  ): Promise<IRenewalInfo> {
    try {
      // Verifica se a assinatura existe
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          plan: true,
          user: {
            select: {
              id: true,
              email: true,
              personalInfo: true,
              companyInfo: true,
            },
          },
          paymentMethod: true,
          paymentCard: true,
          coupon: true,
        },
      });

      if (!subscription) {
        throw new NotFoundError(
          "Assinatura não encontrada",
          "SUBSCRIPTION_NOT_FOUND"
        );
      }

      // Verifica se a assinatura está em um estado válido para renovação
      if (
        subscription.status !== SubscriptionStatus.ACTIVE &&
        subscription.status !== SubscriptionStatus.PAST_DUE
      ) {
        return {
          subscription,
          success: false,
          error: `Assinatura em estado inválido para renovação: ${subscription.status}`,
          newStatus: subscription.status,
        };
      }

      // Se estiver pausada, não renova
      if (subscription.isPaused) {
        return {
          subscription,
          success: false,
          error: "Assinatura está pausada",
          newStatus: subscription.status,
        };
      }

      // Calcula as novas datas
      const currentDate = new Date();
      const currentPeriodStart = currentDate;
      let currentPeriodEnd: Date;

      // Calcula a nova data de expiração baseada no intervalo do plano
      switch (subscription.plan.interval) {
        case "MONTHLY":
          currentPeriodEnd = addMonths(
            currentDate,
            subscription.plan.intervalCount
          );
          break;
        case "QUARTERLY":
          currentPeriodEnd = addMonths(
            currentDate,
            3 * subscription.plan.intervalCount
          );
          break;
        case "SEMIANNUAL":
          currentPeriodEnd = addMonths(
            currentDate,
            6 * subscription.plan.intervalCount
          );
          break;
        case "ANNUAL":
          currentPeriodEnd = addMonths(
            currentDate,
            12 * subscription.plan.intervalCount
          );
          break;
        default:
          currentPeriodEnd = addMonths(currentDate, 1);
      }

      // Calcula o valor da renovação (com desconto, se aplicável)
      let amount = Number(subscription.plan.price);
      let discountAmount = 0;
      let originalAmount = amount;

      if (subscription.couponId && subscription.coupon) {
        // Verifica se o cupom ainda é válido
        const coupon = subscription.coupon;
        const now = new Date();

        const isCouponValid =
          coupon.status === "ACTIVE" &&
          new Date(coupon.startDate) <= now &&
          new Date(coupon.endDate) >= now;

        if (isCouponValid) {
          // Calcula o desconto
          if (coupon.discountType === "PERCENTAGE") {
            discountAmount =
              Number(subscription.plan.price) *
              (Number(coupon.discountValue) / 100);
          } else {
            discountAmount = Number(coupon.discountValue);
          }

          // Garante que o desconto não exceda o valor máximo definido
          if (
            coupon.maxDiscountAmount &&
            discountAmount > Number(coupon.maxDiscountAmount)
          ) {
            discountAmount = Number(coupon.maxDiscountAmount);
          }

          amount -= discountAmount;
        }
      }

      // Tenta processar o pagamento
      let newStatus = subscription.status;
      let payment: Payment | undefined;

      try {
        // Cria o pagamento no banco de dados
        const paymentData: ISubscriptionPaymentDTO = {
          subscriptionId: subscription.id,
          amount,
          currency: "BRL",
          status: PaymentStatus.PENDING,
          description: `Renovação da assinatura ${subscription.id} - ${format(
            currentDate,
            "dd/MM/yyyy"
          )}`,
          paymentDate: currentDate,
          discountAmount: discountAmount > 0 ? discountAmount : undefined,
          originalAmount: discountAmount > 0 ? originalAmount : undefined,
          couponCode: subscription.coupon?.code,
        };

        payment = await this.processPayment(paymentData);

        // Atualiza o status da assinatura
        newStatus = SubscriptionStatus.ACTIVE;

        // Registra o uso do cupom, se aplicável
        if (subscription.couponId && discountAmount > 0) {
          await prisma.couponUsageHistory.create({
            data: {
              couponId: subscription.couponId,
              userId: subscription.userId,
              subscriptionId: subscription.id,
              discountAmount,
              originalAmount,
            },
          });

          // Incrementa o contador de uso do cupom
          await prisma.coupon.update({
            where: { id: subscription.couponId },
            data: {
              usageCount: { increment: 1 },
              totalDiscountAmount: { increment: discountAmount },
            },
          });
        }

        // Atualiza a assinatura com as novas datas
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: newStatus,
            currentPeriodStart,
            currentPeriodEnd,
            nextBillingDate: currentPeriodEnd,
            renewalFailures: 0,
            renewalAttemptDate: currentDate,
          },
        });

        logger.info(`Assinatura renovada com sucesso: ${subscription.id}`, {
          subscriptionId: subscription.id,
          userId: subscription.userId,
          amount,
          nextBillingDate: currentPeriodEnd,
        });

        return {
          subscription: {
            ...subscription,
            status: newStatus,
            currentPeriodStart,
            currentPeriodEnd,
            nextBillingDate: currentPeriodEnd,
            renewalFailures: 0,
            renewalAttemptDate: currentDate,
          },
          success: true,
          payment,
          newStatus,
        };
      } catch (error) {
        // Atualiza o contador de falhas
        const renewalFailures = (subscription.renewalFailures || 0) + 1;

        // Define o novo status com base no número de falhas
        if (renewalFailures >= 3) {
          newStatus = SubscriptionStatus.PAST_DUE;
        }

        // Atualiza a assinatura com o status de falha
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: newStatus,
            renewalFailures,
            renewalAttemptDate: currentDate,
          },
        });

        logger.error(`Falha ao renovar assinatura ${subscription.id}:`, error);

        return {
          subscription: {
            ...subscription,
            status: newStatus,
            renewalFailures,
            renewalAttemptDate: currentDate,
          },
          success: false,
          error: `Falha ao processar pagamento: ${
            error instanceof Error ? error.message : String(error)
          }`,
          newStatus,
        };
      }
    } catch (error) {
      logger.error(`Erro ao renovar assinatura ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Processa um pagamento de assinatura
   * @param paymentData Dados do pagamento
   * @returns Pagamento processado
   */
  public async processPayment(
    paymentData: ISubscriptionPaymentDTO
  ): Promise<Payment> {
    try {
      // Verifica se a assinatura existe
      const subscription = await prisma.subscription.findUnique({
        where: { id: paymentData.subscriptionId },
      });

      if (!subscription) {
        throw new NotFoundError(
          "Assinatura não encontrada",
          "SUBSCRIPTION_NOT_FOUND"
        );
      }

      // Cria o pagamento no banco de dados
      const payment = await prisma.payment.create({
        data: {
          subscriptionId: paymentData.subscriptionId,
          amount: paymentData.amount,
          currency: paymentData.currency || "BRL",
          status: paymentData.status,
          description: paymentData.description,
          paymentDate: paymentData.paymentDate,
          mpPaymentId: paymentData.mpPaymentId,
          mpExternalReference: paymentData.mpExternalReference,
          mpPreferenceId: paymentData.mpPreferenceId,
          mpMerchantOrderId: paymentData.mpMerchantOrderId,
          mpPaymentMethodId: paymentData.mpPaymentMethodId,
          mpPaymentTypeId: paymentData.mpPaymentTypeId,
          mpStatus: paymentData.mpStatus,
          mpStatusDetail: paymentData.mpStatusDetail,
          gatewayResponse: paymentData.gatewayResponse as any,
          discountAmount: paymentData.discountAmount,
          originalAmount: paymentData.originalAmount,
          couponCode: paymentData.couponCode,
        },
      });

      logger.info(`Pagamento processado: ${payment.id}`, {
        paymentId: payment.id,
        subscriptionId: paymentData.subscriptionId,
        amount: paymentData.amount,
        status: paymentData.status,
      });

      return payment;
    } catch (error) {
      logger.error("Erro ao processar pagamento:", error);
      throw error;
    }
  }

  /**
   * Obtém os métodos de pagamento disponíveis
   * @returns Lista de métodos de pagamento
   */
  public async getAvailablePaymentMethods(): Promise<PaymentMethod[]> {
    try {
      return await prisma.paymentMethod.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
    } catch (error) {
      logger.error("Erro ao buscar métodos de pagamento:", error);
      throw error;
    }
  }

  /**
   * Atualiza uma assinatura com dados do MercadoPago
   * @param mpSubscriptionId ID da assinatura no MercadoPago
   * @returns Assinatura atualizada ou null se não encontrada
   */
  public async updateSubscriptionFromMercadoPago(
    mpSubscriptionId: string
  ): Promise<Subscription | null> {
    try {
      // Busca a assinatura no banco de dados
      const subscription = await prisma.subscription.findFirst({
        where: { mpSubscriptionId },
        include: {
          plan: true,
          user: {
            select: { id: true, email: true },
          },
        },
      });

      if (!subscription) {
        logger.warn(
          `Assinatura não encontrada para mpSubscriptionId: ${mpSubscriptionId}`
        );
        return null;
      }

      // Busca os dados da assinatura no MercadoPago
      const subscriptionAdapter = getSubscriptionAdapter();
      const mpSubscription = await subscriptionAdapter.get(mpSubscriptionId);

      if (!mpSubscription) {
        logger.warn(
          `Assinatura não encontrada no MercadoPago: ${mpSubscriptionId}`
        );
        return subscription;
      }

      // Mapeia o status do MercadoPago para o status interno
      let newStatus: SubscriptionStatus;

      switch (mpSubscription.status) {
        case "authorized":
          newStatus = SubscriptionStatus.ACTIVE;
          break;
        case "paused":
          newStatus = SubscriptionStatus.ACTIVE; // Mantém ACTIVE, mas seta isPaused
          break;
        case "cancelled":
          newStatus = SubscriptionStatus.CANCELED;
          break;
        case "pending":
          newStatus = SubscriptionStatus.PENDING;
          break;
        default:
          newStatus = subscription.status;
      }

      // Atualiza os dados da assinatura
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: newStatus,
          isPaused: mpSubscription.status === "paused",
          pausedAt:
            mpSubscription.status === "paused"
              ? new Date()
              : subscription.pausedAt,
          canceledAt:
            mpSubscription.status === "cancelled"
              ? new Date()
              : subscription.canceledAt,
          nextBillingDate: mpSubscription.next_payment_date
            ? new Date(mpSubscription.next_payment_date)
            : subscription.nextBillingDate,
        },
      });

      logger.info(
        `Assinatura atualizada a partir do MercadoPago: ${subscription.id}`,
        {
          subscriptionId: subscription.id,
          mpSubscriptionId,
          oldStatus: subscription.status,
          newStatus: updatedSubscription.status,
          isPaused: updatedSubscription.isPaused,
        }
      );

      return updatedSubscription;
    } catch (error) {
      logger.error(
        `Erro ao atualizar assinatura do MercadoPago ${mpSubscriptionId}:`,
        error
      );
      throw error;
    }
  }
}

// Instância do serviço para exportação
export const subscriptionService = new SubscriptionService();
