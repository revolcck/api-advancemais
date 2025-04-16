/**
 * Fábrica para serviços de assinatura do MercadoPago
 * Responsável por criar e configurar serviços de assinatura
 * @module modules/mercadopago/factories/subscription.factory
 */

import { ISubscriptionService } from "../interfaces/services.interface";
import { mercadoPagoCoreService } from "../services/core.service";
import {
  SubscriptionCreateData,
  SubscriptionResponse,
  SubscriptionUpdateData,
} from "../types/subscription.types";
import { logger } from "@/shared/utils/logger.utils";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { MercadoPagoIntegrationType } from "../enums";

/**
 * Implementação padrão do serviço de assinatura
 * Utiliza os adaptadores do core para realizar operações de assinatura
 */
class DefaultSubscriptionService implements ISubscriptionService {
  /**
   * Cria uma nova assinatura
   * @param data Dados para criação da assinatura
   * @param options Opções adicionais
   */
  public async createSubscription(
    data: SubscriptionCreateData,
    options?: Record<string, any>
  ): Promise<SubscriptionResponse> {
    try {
      const subscriptionAdapter =
        mercadoPagoCoreService.getSubscriptionAdapter();
      return await subscriptionAdapter.create(data);
    } catch (error) {
      logger.error("Erro ao criar assinatura", { error, data });
      throw new ServiceUnavailableError(
        "Não foi possível criar a assinatura no momento",
        "SUBSCRIPTION_CREATION_FAILED"
      );
    }
  }

  /**
   * Obtém detalhes de uma assinatura por ID
   * @param id ID da assinatura
   */
  public async getSubscription(id: string): Promise<SubscriptionResponse> {
    try {
      const subscriptionAdapter =
        mercadoPagoCoreService.getSubscriptionAdapter();
      return await subscriptionAdapter.get(id);
    } catch (error) {
      logger.error(`Erro ao obter assinatura ${id}`, { error });
      throw new ServiceUnavailableError(
        "Não foi possível obter os detalhes da assinatura",
        "SUBSCRIPTION_RETRIEVAL_FAILED"
      );
    }
  }

  /**
   * Atualiza uma assinatura existente
   * @param id ID da assinatura
   * @param data Dados para atualização
   */
  public async updateSubscription(
    id: string,
    data: SubscriptionUpdateData
  ): Promise<SubscriptionResponse> {
    try {
      const subscriptionAdapter =
        mercadoPagoCoreService.getSubscriptionAdapter();
      return await subscriptionAdapter.update(id, data);
    } catch (error) {
      logger.error(`Erro ao atualizar assinatura ${id}`, { error, data });
      throw new ServiceUnavailableError(
        "Não foi possível atualizar a assinatura",
        "SUBSCRIPTION_UPDATE_FAILED"
      );
    }
  }

  /**
   * Cancela uma assinatura
   * @param id ID da assinatura
   */
  public async cancelSubscription(id: string): Promise<SubscriptionResponse> {
    try {
      const subscriptionAdapter =
        mercadoPagoCoreService.getSubscriptionAdapter();
      return await subscriptionAdapter.update(id, {
        status: "cancelled",
      });
    } catch (error) {
      logger.error(`Erro ao cancelar assinatura ${id}`, { error });
      throw new ServiceUnavailableError(
        "Não foi possível cancelar a assinatura",
        "SUBSCRIPTION_CANCELLATION_FAILED"
      );
    }
  }

  /**
   * Pausa uma assinatura
   * @param id ID da assinatura
   */
  public async pauseSubscription(id: string): Promise<SubscriptionResponse> {
    try {
      const subscriptionAdapter =
        mercadoPagoCoreService.getSubscriptionAdapter();
      return await subscriptionAdapter.update(id, {
        status: "paused",
      });
    } catch (error) {
      logger.error(`Erro ao pausar assinatura ${id}`, { error });
      throw new ServiceUnavailableError(
        "Não foi possível pausar a assinatura",
        "SUBSCRIPTION_PAUSE_FAILED"
      );
    }
  }

  /**
   * Retoma uma assinatura pausada
   * @param id ID da assinatura
   */
  public async resumeSubscription(id: string): Promise<SubscriptionResponse> {
    try {
      const subscriptionAdapter =
        mercadoPagoCoreService.getSubscriptionAdapter();
      return await subscriptionAdapter.update(id, {
        status: "authorized",
      });
    } catch (error) {
      logger.error(`Erro ao retomar assinatura ${id}`, { error });
      throw new ServiceUnavailableError(
        "Não foi possível retomar a assinatura",
        "SUBSCRIPTION_RESUME_FAILED"
      );
    }
  }
}

/**
 * Fábrica para criação de serviços de assinatura
 */
export class SubscriptionFactory {
  /**
   * Cria um serviço de assinatura
   * @returns Serviço de assinatura
   */
  public static createSubscriptionService(): ISubscriptionService {
    return new DefaultSubscriptionService();
  }
}
