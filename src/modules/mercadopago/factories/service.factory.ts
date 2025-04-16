/**
 * Fábrica principal para serviços do MercadoPago
 * Ponto central para obtenção de serviços específicos
 * @module modules/mercadopago/factories/service.factory
 */

import { MercadoPagoIntegrationType } from "../enums";
import {
  IMercadoPagoServiceFactory,
  IPaymentService,
  ISubscriptionService,
  IWebhookProcessorService,
} from "../interfaces/services.interface";
import { WebhookService } from "../services/webhook.service";
import { PaymentFactory } from "./payment.factory";
import { logger } from "@/shared/utils/logger.utils";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { mercadoPagoCoreService } from "../services/core.service";

/**
 * Implementação básica de serviço de assinatura
 * Esta implementação lança erros informando que a funcionalidade não está disponível
 */
class BasicSubscriptionService implements ISubscriptionService {
  /**
   * Cria uma nova assinatura
   */
  public async createSubscription(
    data: any,
    options?: Record<string, any>
  ): Promise<any> {
    throw new ServiceUnavailableError(
      "Funcionalidade de assinatura não disponível no momento",
      "SUBSCRIPTION_NOT_AVAILABLE"
    );
  }

  /**
   * Obtém detalhes de uma assinatura por ID
   */
  public async getSubscription(id: string): Promise<any> {
    throw new ServiceUnavailableError(
      "Funcionalidade de assinatura não disponível no momento",
      "SUBSCRIPTION_NOT_AVAILABLE"
    );
  }

  /**
   * Atualiza uma assinatura existente
   */
  public async updateSubscription(id: string, data: any): Promise<any> {
    throw new ServiceUnavailableError(
      "Funcionalidade de assinatura não disponível no momento",
      "SUBSCRIPTION_NOT_AVAILABLE"
    );
  }

  /**
   * Cancela uma assinatura
   */
  public async cancelSubscription(id: string): Promise<any> {
    throw new ServiceUnavailableError(
      "Funcionalidade de assinatura não disponível no momento",
      "SUBSCRIPTION_NOT_AVAILABLE"
    );
  }

  /**
   * Pausa uma assinatura
   */
  public async pauseSubscription(id: string): Promise<any> {
    throw new ServiceUnavailableError(
      "Funcionalidade de assinatura não disponível no momento",
      "SUBSCRIPTION_NOT_AVAILABLE"
    );
  }

  /**
   * Retoma uma assinatura pausada
   */
  public async resumeSubscription(id: string): Promise<any> {
    throw new ServiceUnavailableError(
      "Funcionalidade de assinatura não disponível no momento",
      "SUBSCRIPTION_NOT_AVAILABLE"
    );
  }
}

/**
 * Implementação da fábrica de serviços MercadoPago
 * Centraliza a criação e acesso aos serviços do módulo
 */
class MercadoPagoServiceFactoryImpl implements IMercadoPagoServiceFactory {
  // Cache de instâncias para evitar múltiplas criações
  private paymentServices: Map<MercadoPagoIntegrationType, IPaymentService> =
    new Map();
  private subscriptionService: ISubscriptionService | null = null;
  private webhookProcessor: IWebhookProcessorService | null = null;

  /**
   * Obtém serviço de pagamento para o tipo especificado
   * @param type Tipo de integração (default: CHECKOUT)
   */
  public getPaymentService(
    type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ): IPaymentService {
    // Verifica se já existe uma instância no cache
    if (!this.paymentServices.has(type)) {
      // Cria nova instância e armazena no cache
      const service = PaymentFactory.createPaymentService(type);
      this.paymentServices.set(type, service);
    }

    // Retorna a instância do cache
    return this.paymentServices.get(type)!;
  }

  /**
   * Obtém serviço de assinatura
   */
  public getSubscriptionService(): ISubscriptionService {
    // Verifica se já existe uma instância no cache
    if (!this.subscriptionService) {
      // Cria uma implementação básica
      this.subscriptionService = new BasicSubscriptionService();
    }

    // Retorna a instância do cache (garantimos que não é null)
    return this.subscriptionService;
  }

  /**
   * Obtém processador de webhook
   */
  public getWebhookProcessor(): IWebhookProcessorService {
    // Verifica se já existe uma instância no cache
    if (!this.webhookProcessor) {
      // Cria nova instância e armazena no cache
      this.webhookProcessor = new WebhookService();
    }

    // Retorna a instância do cache
    return this.webhookProcessor!;
  }

  /**
   * Limpa o cache de serviços
   * Útil para testes ou quando há alterações de configuração
   */
  public clearCache(): void {
    this.paymentServices.clear();
    this.subscriptionService = null;
    this.webhookProcessor = null;
  }
}

// Instância singleton da fábrica
export const mercadoPagoServiceFactory = new MercadoPagoServiceFactoryImpl();
