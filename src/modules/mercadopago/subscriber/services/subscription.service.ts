import axios from "axios";
import { logger } from "@/shared/utils/logger.utils";
import { mercadoPagoConfig } from "../../core/config/mercadopago.config";
import { prisma } from "@/config/database";
import { SubscriptionStatus } from "@prisma/client";
import { MercadoPagoPaymentStatus } from "../../dto/payment.dto";
import { AuditService } from "@/shared/services/audit.service";
import {
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from "@/shared/errors/AppError";
import { env } from "@/config/environment";
import {
  formatRequestMetadata,
  mapSubscriptionStatus,
} from "../../utils/mercadopago.util";
import { ISubscriptionService } from "../interfaces/subscription.interface";
import {
  SubscriptionCreationRequest,
  SubscriptionResponseDto,
  SubscriptionDetailsDto,
  SubscriptionCheckDto,
  RecurringData,
  CancelSubscriptionResponseDto,
} from "../../dto/subscription.dto";

/**
 * Serviço para gestão de assinaturas via MercadoPago
 */
export class SubscriptionService implements ISubscriptionService {
  private baseUrl: string;
  private accessToken: string;

  constructor() {
    // MercadoPago não oferece SDK completo para assinaturas,
    // então usamos requisições HTTP diretas
    this.baseUrl = "https://api.mercadopago.com";
    this.accessToken = mercadoPagoConfig.isProductionMode()
      ? env.mercadoPago.prodAccessToken
      : env.mercadoPago.accessToken;
  }

  /**
   * Cria uma nova assinatura no MercadoPago
   */
  public async createSubscription(
    planId: string,
    userId: string,
    data: {
      paymentMethodId: string;
      couponId?: string;
      backUrl?: string;
      paymentCardId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<SubscriptionResponseDto> {
    try {
      logger.info(
        `Criando assinatura para plano ${planId} e usuário ${userId}`
      );

      // Busca informações do plano
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new ValidationError("Plano de assinatura não encontrado");
      }

      // Recupera informações do usuário para o pagamento
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          personalInfo: true,
          companyInfo: true,
        },
      });

      if (!user) {
        throw new ValidationError("Usuário não encontrado");
      }

      // Determina o email e nome conforme o tipo de usuário
      const email = user.email;
      const name =
        user.userType === "PESSOA_FISICA"
          ? user.personalInfo?.name
          : user.companyInfo?.companyName;

      // Prepara dados de cobrança recorrente
      const recurring: RecurringData = {
        frequency: this.getFrequencyValue(plan.interval),
        frequency_type: this.getFrequencyType(plan.interval),
        transaction_amount: Number(plan.price),
        currency_id: "BRL",
      };

      // Prepara metadados
      const metadata = formatRequestMetadata({
        userId,
        planId: plan.id,
        planName: plan.name,
        paymentMethodId: data.paymentMethodId,
        couponId: data.couponId,
        ...data.metadata,
      });

      // Prepara payload para criação de assinatura
      const subscriptionRequest: SubscriptionCreationRequest = {
        reason: `Assinatura ${plan.name}`,
        payer_email: email,
        auto_recurring: recurring,
        back_url: data.backUrl,
        external_reference: userId,
        metadata,
      };

      // Cria a assinatura no MercadoPago
      const response = await axios.post(
        `${this.baseUrl}/preapproval`,
        subscriptionRequest,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      const subscriptionDetails = response.data;

      // Registra a assinatura no banco de dados
      const dbSubscription = await prisma.subscription.create({
        data: {
          status: "PENDING" as SubscriptionStatus,
          startDate: new Date(),
          nextBillingDate: new Date(),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(
            new Date().setMonth(new Date().getMonth() + recurring.frequency)
          ),
          mpPreapprovalId: subscriptionDetails.id,
          mpSubscriptionId: subscriptionDetails.id,
          userId,
          planId,
          paymentMethodId: data.paymentMethodId,
          originalPrice: plan.price,
          metadataJson: subscriptionDetails,
        },
        include: {
          plan: true,
          paymentMethod: true,
        },
      });

      logger.info(`Assinatura criada com sucesso: ${subscriptionDetails.id}`);

      return {
        subscriptionId: dbSubscription.id,
        mpSubscriptionId: subscriptionDetails.id,
        status: "PENDING",
        initPoint: subscriptionDetails.init_point,
      };
    } catch (error) {
      logger.error(`Erro ao criar assinatura: ${error}`, error);

      // Tratamento específico para erros da API do MercadoPago
      if (axios.isAxiosError(error) && error.response) {
        const mpError = error.response.data;
        logger.error(`Erro MercadoPago: ${JSON.stringify(mpError)}`);

        throw new ServiceUnavailableError(
          `Erro ao criar assinatura: ${
            mpError.message || "Falha na comunicação com MercadoPago"
          }`,
          "MERCADOPAGO_SERVICE_ERROR",
          { details: mpError }
        );
      }

      throw new ServiceUnavailableError(
        "Não foi possível processar a solicitação de assinatura no momento",
        "MERCADOPAGO_SERVICE_ERROR",
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Obtém detalhes de uma assinatura
   */
  public async getSubscriptionDetails(
    subscriptionId: string,
    userId: string
  ): Promise<SubscriptionDetailsDto> {
    try {
      logger.info(
        `Obtendo detalhes da assinatura ${subscriptionId} para usuário ${userId}`
      );

      // Busca a assinatura no banco de dados
      const subscription = await prisma.subscription.findFirst({
        where: {
          id: subscriptionId,
          userId,
        },
        include: {
          plan: true,
          paymentMethod: true,
        },
      });

      if (!subscription) {
        throw new NotFoundError("Assinatura");
      }

      // Se tiver ID externo e não estiver cancelada, busca dados atualizados
      let externalDetails = null;
      if (subscription.mpPreapprovalId && subscription.status !== "CANCELED") {
        try {
          externalDetails = await this.getMercadoPagoSubscriptionDetails(
            subscription.mpPreapprovalId
          );
        } catch (error) {
          logger.warn(
            `Erro ao obter detalhes externos da assinatura ${subscription.mpPreapprovalId}`,
            error
          );
        }
      }

      // Monta objeto de resposta
      return {
        id: subscription.id,
        mpSubscriptionId: subscription.mpPreapprovalId || "",
        status: subscription.status,
        startDate: subscription.startDate,
        nextBillingDate: subscription.nextBillingDate,
        plan: {
          id: subscription.plan.id,
          name: subscription.plan.name,
          price: Number(subscription.plan.price),
          interval: subscription.plan.interval,
        },
        paymentMethod: {
          id: subscription.paymentMethod.id,
          type: subscription.paymentMethod.type,
          name: subscription.paymentMethod.name,
        },
        externalDetails: externalDetails
          ? {
              status: externalDetails.status,
              next_payment_date: externalDetails.next_payment_date,
              init_point: externalDetails.init_point,
            }
          : null,
      };
    } catch (error) {
      logger.error(
        `Erro ao obter detalhes da assinatura ${subscriptionId}`,
        error
      );

      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new ServiceUnavailableError(
        "Não foi possível obter os detalhes da assinatura",
        "MERCADOPAGO_SERVICE_ERROR",
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Lista as assinaturas de um usuário
   */
  public async listUserSubscriptions(
    userId: string,
    statusFilter?: string
  ): Promise<SubscriptionDetailsDto[]> {
    try {
      logger.info(`Listando assinaturas para usuário ${userId}`);

      // Prepara a condição de filtro por status se fornecido
      let statusCondition: SubscriptionStatus | undefined = undefined;
      if (statusFilter) {
        statusCondition = statusFilter as SubscriptionStatus;
      }

      // Busca as assinaturas no banco de dados
      const subscriptions = await prisma.subscription.findMany({
        where: {
          userId,
          // Opcionalmente filtra status
          ...(statusCondition && { status: statusCondition }),
        },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              interval: true,
              features: true,
            },
          },
          paymentMethod: {
            select: {
              id: true,
              type: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Mapeia para o formato da resposta
      return subscriptions.map((subscription) => ({
        id: subscription.id,
        mpSubscriptionId: subscription.mpPreapprovalId || "",
        status: subscription.status,
        startDate: subscription.startDate,
        nextBillingDate: subscription.nextBillingDate,
        plan: {
          id: subscription.plan.id,
          name: subscription.plan.name,
          price: Number(subscription.plan.price),
          interval: subscription.plan.interval,
        },
        paymentMethod: {
          id: subscription.paymentMethod.id,
          type: subscription.paymentMethod.type,
          name: subscription.paymentMethod.name,
        },
        externalDetails: null, // Dados externos não incluídos na listagem
      }));
    } catch (error) {
      logger.error(`Erro ao listar assinaturas para usuário ${userId}`, error);
      throw error;
    }
  }

  /**
   * Cancela uma assinatura
   */
  public async cancelSubscription(
    subscriptionId: string,
    userId: string,
    reason?: string
  ): Promise<CancelSubscriptionResponseDto> {
    try {
      logger.info(
        `Cancelando assinatura ${subscriptionId} para usuário ${userId}`
      );

      // Verifica se a assinatura existe no banco de dados
      const subscription = await prisma.subscription.findFirst({
        where: {
          id: subscriptionId,
          userId,
        },
      });

      if (!subscription) {
        throw new NotFoundError("Assinatura");
      }

      // Verifica se possui ID externo do MercadoPago
      if (!subscription.mpPreapprovalId) {
        throw new ValidationError(
          "Assinatura não possui identificação externa"
        );
      }

      // Cancela a assinatura no MercadoPago
      const response = await axios.put(
        `${this.baseUrl}/preapproval/${subscription.mpPreapprovalId}`,
        {
          status: "cancelled",
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (response.status !== 200 && response.status !== 201) {
        throw new ServiceUnavailableError(
          "Falha ao cancelar assinatura no MercadoPago",
          "MERCADOPAGO_SERVICE_ERROR"
        );
      }

      // Atualiza a assinatura no banco de dados
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: "CANCELED" as SubscriptionStatus,
          canceledAt: new Date(),
          cancelReason: reason || "Cancelado pelo usuário",
          updatedAt: new Date(),
        },
      });

      // Registro de auditoria
      AuditService.log(
        "subscription_cancelled",
        "subscription",
        subscriptionId,
        userId,
        {
          mpSubscriptionId: subscription.mpPreapprovalId,
          reason,
        }
      );

      logger.info(`Assinatura ${subscriptionId} cancelada com sucesso`);

      return {
        canceled: true,
        message: "Assinatura cancelada com sucesso",
      };
    } catch (error) {
      logger.error(`Erro ao cancelar assinatura ${subscriptionId}`, error);

      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }

      throw new ServiceUnavailableError(
        "Não foi possível cancelar a assinatura no momento",
        "MERCADOPAGO_SERVICE_ERROR",
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Verifica se um usuário tem assinatura ativa
   */
  public async checkActiveSubscription(
    userId: string
  ): Promise<SubscriptionCheckDto> {
    try {
      logger.info(`Verificando assinatura ativa para usuário ${userId}`);

      // Busca uma assinatura ativa
      const activeSubscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: "ACTIVE" as SubscriptionStatus,
        },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Monta objeto de resposta
      return {
        hasActiveSubscription: !!activeSubscription,
        subscription: activeSubscription
          ? {
              id: activeSubscription.id,
              planName: activeSubscription.plan.name,
              nextBillingDate: activeSubscription.nextBillingDate,
            }
          : null,
      };
    } catch (error) {
      logger.error(
        `Erro ao verificar assinatura ativa para usuário ${userId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Processa uma atualização de assinatura recebida via webhook
   */
  public async processSubscriptionUpdate(
    subscriptionId: string
  ): Promise<void> {
    try {
      logger.info(`Processando atualização de assinatura ${subscriptionId}`);

      // Busca detalhes atualizados da assinatura
      const subscriptionDetails = await this.getMercadoPagoSubscriptionDetails(
        subscriptionId
      );

      // Busca a assinatura no banco de dados pelo ID externo
      const subscription = await prisma.subscription.findFirst({
        where: { mpPreapprovalId: subscriptionId },
        include: { user: true },
      });

      if (!subscription) {
        logger.warn(
          `Assinatura ${subscriptionId} não encontrada no banco de dados`
        );
        return;
      }

      // Mapeia o status do MercadoPago para o formato do banco
      const status = mapSubscriptionStatus(
        subscriptionDetails.status
      ) as SubscriptionStatus;

      // Atualiza a assinatura no banco de dados
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status,
          isPaused: subscriptionDetails.status === "paused",
          pausedAt: subscriptionDetails.status === "paused" ? new Date() : null,
          nextBillingDate: subscriptionDetails.next_payment_date
            ? new Date(subscriptionDetails.next_payment_date)
            : subscription.nextBillingDate,
          metadataJson: subscriptionDetails,
          updatedAt: new Date(),
        },
      });

      // Registro de auditoria
      AuditService.log(
        "subscription_updated",
        "subscription",
        subscription.id,
        subscription.userId,
        {
          mpSubscriptionId: subscriptionId,
          oldStatus: subscription.status,
          newStatus: status,
        }
      );

      logger.info(
        `Assinatura ${subscriptionId} atualizada com sucesso para status: ${status}`
      );
    } catch (error) {
      logger.error(
        `Erro ao processar atualização da assinatura ${subscriptionId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Processa um pagamento de assinatura
   */
  public async processSubscriptionPayment(
    subscriptionId: string,
    paymentId: string,
    status: MercadoPagoPaymentStatus
  ): Promise<void> {
    try {
      logger.info(
        `Processando pagamento ${paymentId} da assinatura ${subscriptionId} com status ${status}`
      );

      // Busca a assinatura no banco de dados
      const subscription = await prisma.subscription.findFirst({
        where: { mpPreapprovalId: subscriptionId },
        include: { user: true, plan: true },
      });

      if (!subscription) {
        logger.warn(
          `Assinatura ${subscriptionId} não encontrada no banco de dados`
        );
        return;
      }

      // Se o pagamento foi aprovado, atualiza os dados da assinatura
      if (status === MercadoPagoPaymentStatus.APPROVED) {
        // Busca detalhes atualizados da assinatura
        const subscriptionDetails =
          await this.getMercadoPagoSubscriptionDetails(subscriptionId);

        // Calcula próxima data de cobrança baseado na frequência
        let nextBillingDate: Date;

        if (subscriptionDetails.next_payment_date) {
          nextBillingDate = new Date(subscriptionDetails.next_payment_date);
        } else {
          // Calcula manualmente baseado na frequência
          const now = new Date();

          if (subscriptionDetails.auto_recurring.frequency_type === "days") {
            nextBillingDate = new Date(
              now.setDate(
                now.getDate() + subscriptionDetails.auto_recurring.frequency
              )
            );
          } else if (
            subscriptionDetails.auto_recurring.frequency_type === "months"
          ) {
            nextBillingDate = new Date(
              now.setMonth(
                now.getMonth() + subscriptionDetails.auto_recurring.frequency
              )
            );
          } else {
            nextBillingDate = new Date(now.setDate(now.getDate() + 30)); // Padrão: 30 dias
          }
        }

        // Atualiza assinatura para ativa
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "ACTIVE" as SubscriptionStatus,
            renewalFailures: 0, // Reseta contagem de falhas
            nextBillingDate,
            currentPeriodStart: new Date(),
            currentPeriodEnd: nextBillingDate,
            updatedAt: new Date(),
          },
        });

        logger.info(
          `Assinatura ${subscription.id} ativada/renovada com sucesso. Próxima cobrança: ${nextBillingDate}`
        );

        // Registro de auditoria
        AuditService.log(
          "subscription_payment_approved",
          "subscription",
          subscription.id,
          subscription.userId,
          {
            mpPaymentId: paymentId,
            amount: subscription.plan.price,
            nextBillingDate,
          }
        );
      } else if (
        status === MercadoPagoPaymentStatus.REJECTED ||
        status === MercadoPagoPaymentStatus.CANCELLED
      ) {
        // Se o pagamento foi rejeitado, incrementa contador de falhas
        const renewalFailures = subscription.renewalFailures + 1;

        // Se atingiu limite de falhas, suspende a assinatura
        const newStatus =
          renewalFailures >= 3
            ? ("PAYMENT_FAILED" as SubscriptionStatus)
            : (subscription.status as SubscriptionStatus);

        // Atualiza assinatura
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: newStatus,
            renewalFailures,
            renewalAttemptDate: new Date(),
            updatedAt: new Date(),
          },
        });

        logger.info(
          `Falha de pagamento registrada para assinatura ${subscription.id}. Falhas: ${renewalFailures}`
        );

        // Registro de auditoria
        AuditService.log(
          "subscription_payment_failed",
          "subscription",
          subscription.id,
          subscription.userId,
          {
            mpPaymentId: paymentId,
            failureCount: renewalFailures,
            newStatus,
          }
        );
      }
    } catch (error) {
      logger.error(
        `Erro ao processar pagamento ${paymentId} da assinatura ${subscriptionId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Processa uma atualização de plano
   */
  public async processPlanUpdate(planId: string): Promise<void> {
    try {
      logger.info(`Processando atualização de plano ${planId}`);

      // Implementação futura - atualizar planos quando configurados
      logger.info(`Atualização de plano ${planId} processada com sucesso`);
    } catch (error) {
      logger.error(`Erro ao processar atualização de plano ${planId}`, error);
      throw error;
    }
  }

  /**
   * Obtém detalhes de uma assinatura do MercadoPago
   */
  private async getMercadoPagoSubscriptionDetails(
    subscriptionId: string
  ): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/preapproval/${subscriptionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error(
        `Erro ao obter detalhes da assinatura ${subscriptionId} do MercadoPago`,
        error
      );

      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new NotFoundError("Assinatura", "SUBSCRIPTION_NOT_FOUND");
      }

      throw new ServiceUnavailableError(
        "Não foi possível obter os detalhes da assinatura",
        "MERCADOPAGO_SERVICE_ERROR",
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Converte o intervalo de cobrança para valor numérico
   */
  private getFrequencyValue(interval: string): number {
    switch (interval) {
      case "MONTHLY":
        return 1;
      case "QUARTERLY":
        return 3;
      case "SEMIANNUAL":
        return 6;
      case "ANNUAL":
        return 12;
      default:
        return 1; // Padrão: mensal
    }
  }

  /**
   * Converte o intervalo de cobrança para tipo de frequência
   */
  private getFrequencyType(interval: string): "days" | "months" {
    return "months"; // Todos os intervalos suportados são em meses
  }
}

export const subscriptionService = new SubscriptionService();
