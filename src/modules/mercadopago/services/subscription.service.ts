/**
 * Serviço para gerenciamento de assinaturas via MercadoPago
 * @module modules/mercadopago/services/subscription.service
 */

import { PreApproval } from "mercadopago";
import { MercadoPagoBaseService } from "./base.service";
import { MercadoPagoIntegrationType } from "../config/credentials";
import { logger } from "@/shared/utils/logger.utils";
import { AuditService } from "@/shared/services/audit.service";
import { ISubscriptionService } from "../interfaces";
import {
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  MercadoPagoBaseResponse,
} from "../dtos/mercadopago.dto";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { SubscriptionAdapter } from "../adapters/subscription.adapter";
import {
  SubscriptionCreateData,
  SubscriptionUpdateData,
  SubscriptionSearchCriteria,
} from "../types/subscription-custom.types";

/**
 * Serviço para gerenciamento de assinaturas via MercadoPago
 * Implementa a interface ISubscriptionService
 */
export class SubscriptionService
  extends MercadoPagoBaseService
  implements ISubscriptionService
{
  private preApprovalClient: PreApproval;
  private subscriptionAdapter: SubscriptionAdapter;

  /**
   * Construtor do serviço de assinatura
   */
  constructor() {
    super(MercadoPagoIntegrationType.SUBSCRIPTION);
    this.preApprovalClient = this.createPreApprovalClient();
    this.subscriptionAdapter = new SubscriptionAdapter(this.preApprovalClient);
    logger.debug("Serviço de assinatura do MercadoPago inicializado");
  }

  /**
   * Cria uma nova assinatura
   * @param subscriptionData Dados da assinatura
   * @param userId ID do usuário para auditoria
   * @returns Resultado da criação da assinatura
   */
  public async createSubscription(
    subscriptionData: CreateSubscriptionRequest
  ): Promise<CreateSubscriptionResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de assinatura do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      const userId = subscriptionData.userId;

      // Remove campos específicos da nossa API que não são para o MercadoPago
      const { userId: _, ...mpSubscriptionData } = subscriptionData;

      // Prepara os dados para a API do MercadoPago
      const subscriptionApiData: SubscriptionCreateData = {
        preapproval_plan_id: undefined, // Não estamos usando planos pré-definidos
        reason: mpSubscriptionData.reason || mpSubscriptionData.preapprovalName,
        external_reference: mpSubscriptionData.externalReference,
        payer_email: mpSubscriptionData.payer.email,
        auto_recurring: {
          frequency: mpSubscriptionData.autoRecurring.frequency,
          frequency_type: mpSubscriptionData.autoRecurring.frequencyType,
          start_date: mpSubscriptionData.autoRecurring.startDate,
          end_date: mpSubscriptionData.autoRecurring.endDate,
          transaction_amount: mpSubscriptionData.preapprovalAmount,
          currency_id: "BRL", // Fixa moeda em Reais
        },
        back_url: mpSubscriptionData.backUrl,
        status: "pending", // Sempre começa como pendente
      };

      logger.info("Iniciando criação de assinatura no MercadoPago", {
        externalReference: subscriptionApiData.external_reference,
        planId: subscriptionApiData.preapproval_plan_id,
        payerEmail: subscriptionApiData.payer_email,
      });

      // Usa o adaptador para criar a assinatura
      const result = await this.subscriptionAdapter.create(subscriptionApiData);

      // Registra a operação para auditoria
      AuditService.log(
        "subscription_created",
        "subscription",
        result.id,
        userId,
        {
          amount: subscriptionApiData.auto_recurring?.transaction_amount,
          frequency: `${subscriptionApiData.auto_recurring?.frequency}/${subscriptionApiData.auto_recurring?.frequency_type}`,
          status: result.status,
        }
      );

      logger.info("Assinatura criada com sucesso no MercadoPago", {
        subscriptionId: result.id,
        status: result.status,
        initPoint: result.init_point,
      });

      return {
        success: true,
        subscriptionId: result.id,
        status: parseInt(result.status) || undefined,
        initPoint: result.init_point,
        data: result,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      // Se for outro tipo de erro, formata para resposta
      const { message, code } = this.formatErrorResponse(
        error,
        "createSubscription"
      );

      return {
        success: false,
        error: message,
        errorCode: code,
      };
    }
  }

  /**
   * Obtém informações de uma assinatura por ID
   * @param subscriptionId ID da assinatura
   * @returns Detalhes da assinatura
   */
  public async getSubscription(
    subscriptionId: string
  ): Promise<MercadoPagoBaseResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de assinatura do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      logger.debug(`Obtendo informações da assinatura ${subscriptionId}`);

      // Usa o adaptador para obter a assinatura
      const result = await this.subscriptionAdapter.get(subscriptionId);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      return this.formatErrorResponse(error, "getSubscription");
    }
  }

  /**
   * Atualiza uma assinatura existente
   * @param subscriptionId ID da assinatura
   * @param updateData Dados para atualização
   * @param userId ID do usuário para auditoria
   * @returns Resultado da atualização
   */
  public async updateSubscription(
    subscriptionId: string,
    updateData: SubscriptionUpdateData,
    userId?: string
  ): Promise<MercadoPagoBaseResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de assinatura do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      logger.info(`Atualizando assinatura ${subscriptionId}`, {
        updateFields: Object.keys(updateData),
      });

      // Usa o adaptador para atualizar a assinatura
      const result = await this.subscriptionAdapter.update(
        subscriptionId,
        updateData
      );

      // Registra a operação para auditoria
      AuditService.log(
        "subscription_updated",
        "subscription",
        subscriptionId,
        userId,
        {
          updatedFields: Object.keys(updateData),
          status: result.status,
        }
      );

      logger.info(`Assinatura atualizada com sucesso`, {
        subscriptionId,
        status: result.status,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      return this.formatErrorResponse(error, "updateSubscription");
    }
  }

  /**
   * Cancela uma assinatura
   * @param subscriptionId ID da assinatura
   * @param userId ID do usuário para auditoria
   * @returns Resultado do cancelamento
   */
  public async cancelSubscription(
    subscriptionId: string,
    userId?: string
  ): Promise<MercadoPagoBaseResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de assinatura do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      logger.info(`Cancelando assinatura ${subscriptionId}`);

      // Busca a assinatura para saber o status atual
      const currentSubscription = await this.getSubscription(subscriptionId);
      if (!currentSubscription.success) {
        return currentSubscription;
      }

      const currentStatus = currentSubscription.data.status;

      // Usa o adaptador para atualizar a assinatura para status "cancelled"
      const result = await this.subscriptionAdapter.update(subscriptionId, {
        status: "cancelled",
      });

      // Registra a operação para auditoria
      AuditService.log(
        "subscription_cancelled",
        "subscription",
        subscriptionId,
        userId,
        {
          previousStatus: currentStatus,
          newStatus: "cancelled",
        }
      );

      logger.info(`Assinatura cancelada com sucesso`, {
        subscriptionId,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      return this.formatErrorResponse(error, "cancelSubscription");
    }
  }

  /**
   * Pausa uma assinatura
   * @param subscriptionId ID da assinatura
   * @param userId ID do usuário para auditoria
   * @returns Resultado da pausa
   */
  public async pauseSubscription(
    subscriptionId: string,
    userId?: string
  ): Promise<MercadoPagoBaseResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de assinatura do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      logger.info(`Pausando assinatura ${subscriptionId}`);

      // Busca a assinatura para saber o status atual
      const currentSubscription = await this.getSubscription(subscriptionId);
      if (!currentSubscription.success) {
        return currentSubscription;
      }

      const currentStatus = currentSubscription.data.status;

      // Usa o adaptador para atualizar a assinatura para status "paused"
      const result = await this.subscriptionAdapter.update(subscriptionId, {
        status: "paused",
      });

      // Registra a operação para auditoria
      AuditService.log(
        "subscription_paused",
        "subscription",
        subscriptionId,
        userId,
        {
          previousStatus: currentStatus,
          newStatus: "paused",
        }
      );

      logger.info(`Assinatura pausada com sucesso`, {
        subscriptionId,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      return this.formatErrorResponse(error, "pauseSubscription");
    }
  }

  /**
   * Reativa uma assinatura pausada
   * @param subscriptionId ID da assinatura
   * @param userId ID do usuário para auditoria
   * @returns Resultado da reativação
   */
  public async resumeSubscription(
    subscriptionId: string,
    userId?: string
  ): Promise<MercadoPagoBaseResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de assinatura do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      logger.info(`Reativando assinatura ${subscriptionId}`);

      // Busca a assinatura para saber o status atual
      const currentSubscription = await this.getSubscription(subscriptionId);
      if (!currentSubscription.success) {
        return currentSubscription;
      }

      const currentStatus = currentSubscription.data.status;

      // Verifica se a assinatura está pausada
      if (currentStatus !== "paused") {
        logger.warn(
          `Tentativa de reativar assinatura que não está pausada: ${subscriptionId}, status: ${currentStatus}`
        );
        return {
          success: false,
          error: "Somente assinaturas pausadas podem ser reativadas",
          errorCode: "SUBSCRIPTION_NOT_PAUSED",
        };
      }

      // Usa o adaptador para atualizar a assinatura para status "authorized"
      const result = await this.subscriptionAdapter.update(subscriptionId, {
        status: "authorized",
      });

      // Registra a operação para auditoria
      AuditService.log(
        "subscription_resumed",
        "subscription",
        subscriptionId,
        userId,
        {
          previousStatus: currentStatus,
          newStatus: "authorized",
        }
      );

      logger.info(`Assinatura reativada com sucesso`, {
        subscriptionId,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      return this.formatErrorResponse(error, "resumeSubscription");
    }
  }

  /**
   * Pesquisa assinaturas por critérios
   * @param criteria Critérios de pesquisa
   * @returns Lista de assinaturas
   */
  public async searchSubscriptions(
    criteria: SubscriptionSearchCriteria
  ): Promise<MercadoPagoBaseResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de assinatura do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      logger.debug("Pesquisando assinaturas no MercadoPago", {
        criteria,
      });

      // Usa o adaptador para pesquisar assinaturas
      const result = await this.subscriptionAdapter.search(criteria);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      return this.formatErrorResponse(error, "searchSubscriptions");
    }
  }

  /**
   * Processa webhook de assinatura
   * @param subscriptionId ID da assinatura
   * @param type Tipo de notificação
   * @returns Resultado do processamento
   */
  public async processSubscriptionWebhook(
    subscriptionId: string,
    type: string
  ): Promise<MercadoPagoBaseResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de assinatura do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      logger.info(`Processando webhook de assinatura ID: ${subscriptionId}`, {
        type,
      });

      // Obtém os detalhes da assinatura
      const subscriptionDetails = await this.getSubscription(subscriptionId);

      if (!subscriptionDetails.success) {
        return subscriptionDetails;
      }

      // Aqui você adicionaria lógica para atualizar seu sistema com os novos dados
      // Por exemplo, processar mudanças de status, atualizar banco de dados, etc.

      logger.info(`Webhook de assinatura processado com sucesso`, {
        subscriptionId,
        status: subscriptionDetails.data.status,
        type,
      });

      return {
        success: true,
        data: subscriptionDetails.data,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      return this.formatErrorResponse(error, "processSubscriptionWebhook");
    }
  }

  /**
   * Atualiza o valor de uma assinatura
   * @param subscriptionId ID da assinatura
   * @param amount Novo valor
   * @param userId ID do usuário para auditoria
   * @returns Resultado da atualização
   */
  public async updateSubscriptionAmount(
    subscriptionId: string,
    amount: number,
    userId?: string
  ): Promise<MercadoPagoBaseResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de assinatura do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      logger.info(
        `Atualizando valor da assinatura ${subscriptionId} para ${amount}`
      );

      // Busca a assinatura para validar status atual
      const currentSubscription = await this.getSubscription(subscriptionId);
      if (!currentSubscription.success) {
        return currentSubscription;
      }

      // Verifica se valor é diferente do atual
      if (
        currentSubscription.data.auto_recurring?.transaction_amount === amount
      ) {
        logger.info(
          `Valor da assinatura ${subscriptionId} já é ${amount}, nenhuma atualização necessária`
        );
        return {
          success: true,
          data: currentSubscription.data,
        };
      }

      // Prepara dados para atualização
      const updateData: SubscriptionUpdateData = {
        auto_recurring: {
          transaction_amount: amount,
        },
      };

      // Usa o adaptador para atualizar a assinatura
      const result = await this.subscriptionAdapter.update(
        subscriptionId,
        updateData
      );

      // Registra a operação para auditoria
      AuditService.log(
        "subscription_amount_updated",
        "subscription",
        subscriptionId,
        userId,
        {
          previousAmount:
            currentSubscription.data.auto_recurring?.transaction_amount,
          newAmount: amount,
        }
      );

      logger.info(`Valor da assinatura atualizado com sucesso`, {
        subscriptionId,
        amount,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      return this.formatErrorResponse(error, "updateSubscriptionAmount");
    }
  }

  /**
   * Formata um erro do MercadoPago para resposta da API
   * @param error Erro original
   * @param operation Nome da operação
   * @returns Resposta de erro formatada
   */
  private formatErrorResponse(
    error: any,
    operation: string
  ): MercadoPagoBaseResponse & { message: string; code: string } {
    const errorResponse: any = {
      success: false,
    };

    // Tenta extrair detalhes do erro
    if (error && error.cause && Array.isArray(error.cause)) {
      // Formato específico de erro da API do MercadoPago
      const causes = error.cause
        .map((c: any) => c.description || c.message || JSON.stringify(c))
        .join(", ");

      errorResponse.error = `Erro na operação ${operation} do MercadoPago: ${causes}`;
      errorResponse.errorCode = `MERCADOPAGO_${operation.toUpperCase()}_ERROR`;
      errorResponse.message = errorResponse.error;
      errorResponse.code = errorResponse.errorCode;
    } else if (error && error.response && error.response.data) {
      // Erro HTTP com resposta estruturada
      const errorData = error.response.data;
      errorResponse.error =
        errorData.message || `Erro na operação ${operation} do MercadoPago`;
      errorResponse.errorCode =
        errorData.code || `MERCADOPAGO_${operation.toUpperCase()}_ERROR`;
      errorResponse.message = errorResponse.error;
      errorResponse.code = errorResponse.errorCode;
    } else {
      // Erro genérico
      errorResponse.error =
        error instanceof Error
          ? error.message
          : `Erro na operação ${operation} do MercadoPago`;
      errorResponse.errorCode = `MERCADOPAGO_${operation.toUpperCase()}_ERROR`;
      errorResponse.message = errorResponse.error;
      errorResponse.code = errorResponse.errorCode;
    }

    // Registra o erro
    logger.error(errorResponse.error, {
      operation,
      integrationType: this.integrationType,
      error,
    });

    return errorResponse;
  }
}

export const subscriptionService = new SubscriptionService();
