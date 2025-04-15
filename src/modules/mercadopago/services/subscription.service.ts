/**
 * Serviço para integração com MercadoPago Subscriptions API (pagamentos recorrentes)
 * Implementa a integração para assinaturas recorrentes
 * @module modules/mercadopago/services/subscription.service
 */

import { logger } from "@/shared/utils/logger.utils";
import { mercadoPagoConfig } from "../config/mercadopago.config";
import { SubscriptionAdapter, PaymentAdapter } from "../adapters";
import { MercadoPagoIntegrationType } from "../enums";
import {
  SubscriptionCreateData,
  SubscriptionResponse,
  SubscriptionUpdateData,
} from "../types/subscription.types";
import { ServiceUnavailableError } from "@/shared/errors/AppError";

/**
 * Serviço para processamento de assinaturas via MercadoPago
 */
export class SubscriptionService {
  private static instance: SubscriptionService;
  private subscriptionAdapter: SubscriptionAdapter;
  private paymentAdapter: PaymentAdapter;

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {
    const type = MercadoPagoIntegrationType.SUBSCRIPTION;
    this.subscriptionAdapter = new SubscriptionAdapter(
      mercadoPagoConfig.getConfig(type).getPreApprovalClient()
    );
    this.paymentAdapter = new PaymentAdapter(
      mercadoPagoConfig.getConfig(type).getPaymentClient(),
      type
    );
  }

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
   * Cria uma nova assinatura
   * @param data Dados da assinatura
   * @returns Objeto da assinatura criada
   */
  public async createSubscription(
    data: SubscriptionCreateData
  ): Promise<SubscriptionResponse> {
    try {
      return await this.subscriptionAdapter.create(data);
    } catch (error) {
      logger.error("Erro ao criar assinatura", error);
      throw new ServiceUnavailableError(
        "Não foi possível criar a assinatura",
        "MERCADOPAGO_SUBSCRIPTION_ERROR",
        { error }
      );
    }
  }

  /**
   * Obtém informações de uma assinatura
   * @param id ID da assinatura
   * @returns Informações da assinatura
   */
  public async getSubscription(id: string): Promise<SubscriptionResponse> {
    try {
      return await this.subscriptionAdapter.get(id);
    } catch (error) {
      logger.error(`Erro ao obter informações da assinatura ${id}`, error);
      throw new ServiceUnavailableError(
        "Não foi possível obter informações da assinatura",
        "MERCADOPAGO_SUBSCRIPTION_FETCH_ERROR",
        { error }
      );
    }
  }

  /**
   * Atualiza uma assinatura existente
   * @param id ID da assinatura
   * @param data Dados para atualização
   * @returns Assinatura atualizada
   */
  public async updateSubscription(
    id: string,
    data: SubscriptionUpdateData
  ): Promise<SubscriptionResponse> {
    try {
      return await this.subscriptionAdapter.update(id, data);
    } catch (error) {
      logger.error(`Erro ao atualizar assinatura ${id}`, error);
      throw new ServiceUnavailableError(
        "Não foi possível atualizar a assinatura",
        "MERCADOPAGO_SUBSCRIPTION_UPDATE_ERROR",
        { error }
      );
    }
  }

  /**
   * Pausa uma assinatura
   * @param id ID da assinatura
   * @returns Assinatura atualizada
   */
  public async pauseSubscription(id: string): Promise<SubscriptionResponse> {
    try {
      return await this.subscriptionAdapter.update(id, { status: "paused" });
    } catch (error) {
      logger.error(`Erro ao pausar assinatura ${id}`, error);
      throw new ServiceUnavailableError(
        "Não foi possível pausar a assinatura",
        "MERCADOPAGO_SUBSCRIPTION_PAUSE_ERROR",
        { error }
      );
    }
  }

  /**
   * Reativa uma assinatura pausada
   * @param id ID da assinatura
   * @returns Assinatura atualizada
   */
  public async activateSubscription(id: string): Promise<SubscriptionResponse> {
    try {
      return await this.subscriptionAdapter.update(id, {
        status: "authorized",
      });
    } catch (error) {
      logger.error(`Erro ao reativar assinatura ${id}`, error);
      throw new ServiceUnavailableError(
        "Não foi possível reativar a assinatura",
        "MERCADOPAGO_SUBSCRIPTION_ACTIVATE_ERROR",
        { error }
      );
    }
  }

  /**
   * Cancela uma assinatura
   * @param id ID da assinatura
   * @returns Assinatura atualizada
   */
  public async cancelSubscription(id: string): Promise<SubscriptionResponse> {
    try {
      return await this.subscriptionAdapter.update(id, { status: "cancelled" });
    } catch (error) {
      logger.error(`Erro ao cancelar assinatura ${id}`, error);
      throw new ServiceUnavailableError(
        "Não foi possível cancelar a assinatura",
        "MERCADOPAGO_SUBSCRIPTION_CANCEL_ERROR",
        { error }
      );
    }
  }

  /**
   * Busca os pagamentos de uma assinatura
   * @param subscriptionId ID da assinatura
   * @returns Lista de pagamentos
   */
  public async getSubscriptionPayments(subscriptionId: string) {
    try {
      // Buscar pagamentos relacionados à assinatura
      const payments = await this.paymentAdapter.search({
        external_reference: subscriptionId,
      });

      return payments.results;
    } catch (error) {
      logger.error(
        `Erro ao buscar pagamentos da assinatura ${subscriptionId}`,
        error
      );
      throw new ServiceUnavailableError(
        "Não foi possível obter os pagamentos da assinatura",
        "MERCADOPAGO_SUBSCRIPTION_PAYMENTS_ERROR",
        { error }
      );
    }
  }

  /**
   * Cria um token de cartão para assinatura recorrente
   * @param cardData Dados do cartão
   * @returns Token do cartão
   */
  public async createCardToken(cardData: any) {
    try {
      // Implementação específica para criação de token de cartão
      // Esta funcionalidade requer implementação adicional de acordo com a documentação do MercadoPago

      return {
        token: "CARD_TOKEN", // Simulação
        expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      };
    } catch (error) {
      logger.error(`Erro ao criar token de cartão para assinatura`, error);
      throw new ServiceUnavailableError(
        "Não foi possível gerar o token do cartão",
        "MERCADOPAGO_CARD_TOKEN_ERROR",
        { error }
      );
    }
  }
}

// Exporta uma instância do serviço
export const mpSubscriptionService = SubscriptionService.getInstance();
