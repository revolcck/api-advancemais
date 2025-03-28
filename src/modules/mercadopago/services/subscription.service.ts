// src/modules/mercadopago/services/subscription.service.ts

import { logger } from "@/shared/utils/logger.utils";
import { mercadoPagoService } from "./mercadopago.service";
import { mercadoPagoConfig } from "../config/mercadopago.config";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { AuditService } from "@/shared/services/audit.service";
import { PreApproval } from "mercadopago";
import {
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  GetSubscriptionInfoRequest,
  CancelSubscriptionRequest,
  UpdateSubscriptionStatusRequest,
  UpdateSubscriptionAmountRequest,
} from "../dto/mercadopago.dto";

/**
 * Serviço para gerenciar assinaturas (pagamentos recorrentes) no Mercado Pago
 * Utiliza a API de PreApproval do Mercado Pago para criar e gerenciar assinaturas
 */
export class SubscriptionService {
  private static instance: SubscriptionService;

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {}

  /**
   * Obtém a instância única do serviço
   */
  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  /**
   * Cria uma nova assinatura (pagamento recorrente)
   * @param subscriptionData Dados para criação da assinatura
   * @returns Informações sobre a assinatura criada
   */
  public async createSubscription(
    subscriptionData: CreateSubscriptionRequest
  ): Promise<CreateSubscriptionResponse> {
    try {
      // Validações básicas
      if (!subscriptionData.preapprovalAmount) {
        throw new ServiceUnavailableError(
          "Valor da assinatura é obrigatório",
          "SUBSCRIPTION_AMOUNT_REQUIRED"
        );
      }

      if (!subscriptionData.preapprovalName) {
        throw new ServiceUnavailableError(
          "Nome da assinatura é obrigatório",
          "SUBSCRIPTION_NAME_REQUIRED"
        );
      }

      if (!subscriptionData.payer || !subscriptionData.payer.email) {
        throw new ServiceUnavailableError(
          "Email do assinante é obrigatório",
          "SUBSCRIPTION_PAYER_EMAIL_REQUIRED"
        );
      }

      if (!subscriptionData.backUrl) {
        throw new ServiceUnavailableError(
          "URL de retorno é obrigatória",
          "SUBSCRIPTION_BACK_URL_REQUIRED"
        );
      }

      // Obtém a API de assinaturas (PreApproval)
      const preApproval = mercadoPagoService.getSubscriptionAPI();

      // Data de início padrão (se não for informada)
      const startDate =
        subscriptionData.autoRecurring.startDate ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h à frente

      // Formata os dados para o formato esperado pelo Mercado Pago
      const subscriptionBody = {
        preapproval_plan_id: undefined, // Plano livre (não vinculado a um plano específico)
        reason: subscriptionData.reason || subscriptionData.preapprovalName,
        external_reference: subscriptionData.externalReference,
        payer_email: subscriptionData.payer.email,
        card_token_id: undefined, // Será inserido pelo cliente ao autorizar
        status: "pending",
        auto_recurring: {
          frequency: subscriptionData.autoRecurring.frequency,
          frequency_type: subscriptionData.autoRecurring.frequencyType,
          start_date: startDate,
          end_date: subscriptionData.autoRecurring.endDate,
          currency_id: "BRL", // Moeda em Reais brasileiros
          amount: subscriptionData.preapprovalAmount,
          repetitions: subscriptionData.autoRecurring.repetitions,
        },
        back_url: subscriptionData.backUrl,
        metadata: {
          userId: subscriptionData.userId,
        },
      };

      // Cria opções de requisição (para idempotência)
      const requestOptions = {
        idempotencyKey: `subscription-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 10)}`,
      };

      // Envia a requisição para criar a assinatura
      const result = await preApproval.create({
        body: subscriptionBody,
        requestOptions,
      });

      // Verifica se o resultado é válido
      if (!result || !result.id) {
        throw new Error("Resposta inválida do Mercado Pago");
      }

      // Registra a assinatura no log de auditoria
      AuditService.log(
        "subscription_created",
        "subscription",
        String(result.id),
        subscriptionData.userId,
        {
          amount: subscriptionData.preapprovalAmount,
          frequency: `${subscriptionData.autoRecurring.frequency} ${subscriptionData.autoRecurring.frequencyType}`,
          status: result.status,
        }
      );

      logger.info(`Assinatura criada com sucesso: ${result.id}`, {
        subscriptionId: result.id,
        status: result.status,
        amount: subscriptionData.preapprovalAmount,
      });

      return {
        success: true,
        subscriptionId: String(result.id),
        status: result.status,
        initPoint: result.init_point, // URL para o cliente autorizar a assinatura
        data: result,
      };
    } catch (error) {
      // Trata e formata o erro
      const formattedError = mercadoPagoService.formatError(
        error,
        "create_subscription"
      );

      logger.error(`Erro ao criar assinatura:`, formattedError);

      return {
        success: false,
        error: formattedError.message,
        errorCode: formattedError.code,
      };
    }
  }

  /**
   * Obtém informações de uma assinatura existente
   * @param request Dados para consulta da assinatura
   * @returns Informações detalhadas da assinatura
   */
  public async getSubscriptionInfo(
    request: GetSubscriptionInfoRequest
  ): Promise<CreateSubscriptionResponse> {
    try {
      if (!request.subscriptionId) {
        throw new ServiceUnavailableError(
          "ID da assinatura é obrigatório",
          "SUBSCRIPTION_ID_REQUIRED"
        );
      }

      // Obtém a API de assinaturas (PreApproval)
      const preApproval = mercadoPagoService.getSubscriptionAPI();

      // Consulta a assinatura
      const result = await preApproval.get({ id: request.subscriptionId });

      if (!result || !result.id) {
        throw new Error("Assinatura não encontrada");
      }

      logger.info(
        `Informações da assinatura ${request.subscriptionId} obtidas com sucesso`
      );

      return {
        success: true,
        subscriptionId: String(result.id),
        status: result.status,
        data: result,
      };
    } catch (error) {
      // Trata e formata o erro
      const formattedError = mercadoPagoService.formatError(
        error,
        "get_subscription"
      );

      logger.error(`Erro ao obter informações da assinatura:`, formattedError);

      return {
        success: false,
        error: formattedError.message,
        errorCode: formattedError.code,
      };
    }
  }

  /**
   * Cancela uma assinatura existente
   * @param request Dados para cancelamento da assinatura
   * @returns Informações atualizadas da assinatura
   */
  public async cancelSubscription(
    request: CancelSubscriptionRequest
  ): Promise<CreateSubscriptionResponse> {
    try {
      if (!request.subscriptionId) {
        throw new ServiceUnavailableError(
          "ID da assinatura é obrigatório",
          "SUBSCRIPTION_ID_REQUIRED"
        );
      }

      // Obtém a API de assinaturas (PreApproval)
      const preApproval = mercadoPagoService.getSubscriptionAPI();

      // Atualiza o status para cancelado
      const result = await preApproval.update({
        id: request.subscriptionId,
        body: {
          status: "cancelled",
        },
      });

      if (!result || !result.id) {
        throw new Error("Falha ao cancelar assinatura");
      }

      // Registra o cancelamento no log de auditoria
      AuditService.log(
        "subscription_cancelled",
        "subscription",
        String(result.id),
        undefined, // Usuário pode não estar disponível aqui
        {
          status: result.status,
        }
      );

      logger.info(`Assinatura ${request.subscriptionId} cancelada com sucesso`);

      return {
        success: true,
        subscriptionId: String(result.id),
        status: result.status,
        data: result,
      };
    } catch (error) {
      // Trata e formata o erro
      const formattedError = mercadoPagoService.formatError(
        error,
        "cancel_subscription"
      );

      logger.error(`Erro ao cancelar assinatura:`, formattedError);

      return {
        success: false,
        error: formattedError.message,
        errorCode: formattedError.code,
      };
    }
  }

  /**
   * Atualiza o status de uma assinatura (pausa ou reativa)
   * @param request Dados para atualização do status da assinatura
   * @returns Informações atualizadas da assinatura
   */
  public async updateSubscriptionStatus(
    request: UpdateSubscriptionStatusRequest
  ): Promise<CreateSubscriptionResponse> {
    try {
      if (!request.subscriptionId) {
        throw new ServiceUnavailableError(
          "ID da assinatura é obrigatório",
          "SUBSCRIPTION_ID_REQUIRED"
        );
      }

      if (
        !request.status ||
        !["paused", "authorized"].includes(request.status)
      ) {
        throw new ServiceUnavailableError(
          "Status inválido. Use 'paused' para pausar ou 'authorized' para reativar",
          "SUBSCRIPTION_INVALID_STATUS"
        );
      }

      // Obtém a API de assinaturas (PreApproval)
      const preApproval = mercadoPagoService.getSubscriptionAPI();

      // Atualiza o status
      const result = await preApproval.update({
        id: request.subscriptionId,
        body: {
          status: request.status,
        },
      });

      if (!result || !result.id) {
        throw new Error(
          `Falha ao ${
            request.status === "paused" ? "pausar" : "reativar"
          } assinatura`
        );
      }

      // Registra a ação no log de auditoria
      AuditService.log(
        `subscription_${
          request.status === "paused" ? "paused" : "reactivated"
        }`,
        "subscription",
        String(result.id),
        undefined, // Usuário pode não estar disponível aqui
        {
          status: result.status,
        }
      );

      logger.info(
        `Status da assinatura ${request.subscriptionId} atualizado para ${request.status} com sucesso`
      );

      return {
        success: true,
        subscriptionId: String(result.id),
        status: result.status,
        data: result,
      };
    } catch (error) {
      // Trata e formata o erro
      const formattedError = mercadoPagoService.formatError(
        error,
        "update_subscription_status"
      );

      logger.error(`Erro ao atualizar status da assinatura:`, formattedError);

      return {
        success: false,
        error: formattedError.message,
        errorCode: formattedError.code,
      };
    }
  }

  /**
   * Atualiza o valor de uma assinatura
   * @param request Dados para atualização do valor da assinatura
   * @returns Informações atualizadas da assinatura
   */
  public async updateSubscriptionAmount(
    request: UpdateSubscriptionAmountRequest
  ): Promise<CreateSubscriptionResponse> {
    try {
      if (!request.subscriptionId) {
        throw new ServiceUnavailableError(
          "ID da assinatura é obrigatório",
          "SUBSCRIPTION_ID_REQUIRED"
        );
      }

      if (!request.amount || request.amount <= 0) {
        throw new ServiceUnavailableError(
          "Valor da assinatura deve ser maior que zero",
          "SUBSCRIPTION_INVALID_AMOUNT"
        );
      }

      // Obtém a API de assinaturas (PreApproval)
      const preApproval = mercadoPagoService.getSubscriptionAPI();

      // Obtém a assinatura atual para verificar a configuração de recorrência
      const currentSubscription = await preApproval.get({
        id: request.subscriptionId,
      });

      // Atualiza o valor
      const result = await preApproval.update({
        id: request.subscriptionId,
        body: {
          auto_recurring: {
            ...currentSubscription.auto_recurring,
            amount: request.amount,
          },
        },
      });

      if (!result || !result.id) {
        throw new Error("Falha ao atualizar valor da assinatura");
      }

      // Registra a ação no log de auditoria
      AuditService.log(
        "subscription_amount_updated",
        "subscription",
        String(result.id),
        undefined, // Usuário pode não estar disponível aqui
        {
          previousAmount: currentSubscription.auto_recurring.amount,
          newAmount: request.amount,
        }
      );

      logger.info(
        `Valor da assinatura ${request.subscriptionId} atualizado para ${request.amount} com sucesso`
      );

      return {
        success: true,
        subscriptionId: String(result.id),
        status: result.status,
        data: result,
      };
    } catch (error) {
      // Trata e formata o erro
      const formattedError = mercadoPagoService.formatError(
        error,
        "update_subscription_amount"
      );

      logger.error(`Erro ao atualizar valor da assinatura:`, formattedError);

      return {
        success: false,
        error: formattedError.message,
        errorCode: formattedError.code,
      };
    }
  }

  /**
   * Processa uma notificação de assinatura recebida por webhook
   * @param subscriptionId ID da assinatura
   * @param topic Tópico da notificação
   * @returns Informações atualizadas da assinatura
   */
  public async processSubscriptionWebhook(
    subscriptionId: string,
    topic: string
  ): Promise<CreateSubscriptionResponse> {
    try {
      logger.info(
        `Processando webhook de assinatura: ${topic} - ${subscriptionId}`
      );

      // Apenas busca as informações atualizadas da assinatura
      return await this.getSubscriptionInfo({ subscriptionId });
    } catch (error) {
      // Trata e formata o erro
      const formattedError = mercadoPagoService.formatError(
        error,
        "process_subscription_webhook"
      );

      logger.error(`Erro ao processar webhook de assinatura:`, formattedError);

      return {
        success: false,
        error: formattedError.message,
        errorCode: formattedError.code,
      };
    }
  }
}

// Exporta uma instância do serviço
export const subscriptionService = SubscriptionService.getInstance();
