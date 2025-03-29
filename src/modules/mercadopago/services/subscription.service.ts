/**
 * Serviço para gerenciamento de assinaturas via MercadoPago
 * @module modules/mercadopago/services/subscription.service
 */

import {
  PreApproval,
  PreApprovalCreateData,
  PreApprovalUpdateData,
} from "mercadopago";
import { MercadoPagoBaseService } from "./base.service";
import { MercadoPagoIntegrationType } from "../config/credentials";
import { logger } from "@/shared/utils/logger.utils";
import { AuditService, AuditAction } from "@/shared/services/audit.service";

/**
 * Serviço para gerenciamento de assinaturas
 */
export class SubscriptionService extends MercadoPagoBaseService {
  private preApprovalClient: PreApproval;

  /**
   * Construtor do serviço de assinatura
   */
  constructor() {
    super(MercadoPagoIntegrationType.SUBSCRIPTION);
    this.preApprovalClient = this.createPreApprovalClient();
    logger.debug("Serviço de assinatura do MercadoPago inicializado");
  }

  /**
   * Cria uma nova assinatura
   * @param subscriptionData Dados da assinatura
   * @param userId ID do usuário para auditoria
   * @returns Resultado da criação da assinatura
   */
  public async createSubscription(
    subscriptionData: PreApprovalCreateData,
    userId?: string
  ): Promise<any> {
    try {
      logger.info("Iniciando criação de assinatura no MercadoPago", {
        externalReference: subscriptionData.external_reference,
        planId: subscriptionData.auto_recurring?.plan_id,
      });

      const result = await this.preApprovalClient.create({
        body: subscriptionData,
      });

      // Registra a operação para auditoria
      AuditService.log(AuditAction.CREATE, "subscription", result.id, userId, {
        planId: subscriptionData.auto_recurring?.plan_id,
        amount: subscriptionData.auto_recurring?.transaction_amount,
        frequency: `${subscriptionData.auto_recurring?.frequency}/${subscriptionData.auto_recurring?.frequency_type}`,
        status: result.status,
      });

      logger.info("Assinatura criada com sucesso no MercadoPago", {
        subscriptionId: result.id,
        status: result.status,
      });

      return result;
    } catch (error) {
      this.handleError(error, "createSubscription");
    }
  }

  /**
   * Obtém informações de uma assinatura por ID
   * @param subscriptionId ID da assinatura
   * @returns Detalhes da assinatura
   */
  public async getSubscription(subscriptionId: string): Promise<any> {
    try {
      logger.debug(`Obtendo informações da assinatura ${subscriptionId}`);

      const result = await this.preApprovalClient.get({ id: subscriptionId });

      return result;
    } catch (error) {
      this.handleError(error, "getSubscription");
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
    updateData: PreApprovalUpdateData,
    userId?: string
  ): Promise<any> {
    try {
      logger.info(`Atualizando assinatura ${subscriptionId}`);

      const result = await this.preApprovalClient.update({
        id: subscriptionId,
        body: updateData,
      });

      // Registra a operação para auditoria
      AuditService.log(
        AuditAction.UPDATE,
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

      return result;
    } catch (error) {
      this.handleError(error, "updateSubscription");
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
  ): Promise<any> {
    try {
      logger.info(`Cancelando assinatura ${subscriptionId}`);

      const result = await this.preApprovalClient.update({
        id: subscriptionId,
        body: { status: "cancelled" },
      });

      // Registra a operação para auditoria
      AuditService.log(
        "subscription_cancelled",
        "subscription",
        subscriptionId,
        userId,
        {
          previousStatus: result.status,
          newStatus: "cancelled",
        }
      );

      logger.info(`Assinatura cancelada com sucesso`, {
        subscriptionId,
      });

      return result;
    } catch (error) {
      this.handleError(error, "cancelSubscription");
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
  ): Promise<any> {
    try {
      logger.info(`Pausando assinatura ${subscriptionId}`);

      const result = await this.preApprovalClient.update({
        id: subscriptionId,
        body: { status: "paused" },
      });

      // Registra a operação para auditoria
      AuditService.log(
        "subscription_paused",
        "subscription",
        subscriptionId,
        userId,
        {
          previousStatus: result.status,
          newStatus: "paused",
        }
      );

      logger.info(`Assinatura pausada com sucesso`, {
        subscriptionId,
      });

      return result;
    } catch (error) {
      this.handleError(error, "pauseSubscription");
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
  ): Promise<any> {
    try {
      logger.info(`Reativando assinatura ${subscriptionId}`);

      const result = await this.preApprovalClient.update({
        id: subscriptionId,
        body: { status: "authorized" },
      });

      // Registra a operação para auditoria
      AuditService.log(
        "subscription_resumed",
        "subscription",
        subscriptionId,
        userId,
        {
          previousStatus: result.status,
          newStatus: "authorized",
        }
      );

      logger.info(`Assinatura reativada com sucesso`, {
        subscriptionId,
      });

      return result;
    } catch (error) {
      this.handleError(error, "resumeSubscription");
    }
  }

  /**
   * Pesquisa assinaturas por critérios
   * @param criteria Critérios de pesquisa
   * @returns Lista de assinaturas
   */
  public async searchSubscriptions(criteria: any): Promise<any> {
    try {
      logger.debug("Pesquisando assinaturas no MercadoPago", {
        criteria,
      });

      const result = await this.preApprovalClient.search({ qs: criteria });

      return result;
    } catch (error) {
      this.handleError(error, "searchSubscriptions");
    }
  }
}

// Exporta a instância do serviço
export const subscriptionService = new SubscriptionService();
