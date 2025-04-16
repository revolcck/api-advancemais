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
import { SubscriptionFactory } from "./subscription.factory";

/**
 * Implementação da fábrica de serviços MercadoPago
 * Centraliza a criação e acesso aos serviços do módulo
 */
class MercadoPagoServiceFactoryImpl implements IMercadoPagoServiceFactory {
  // Cache de instâncias para evitar múltiplas criações
  private static paymentServices: Map<
    MercadoPagoIntegrationType,
    IPaymentService
  > = new Map();
  private static subscriptionService: ISubscriptionService | null = null;
  private static webhookProcessor: IWebhookProcessorService | null = null;

  /**
   * Obtém serviço de pagamento para o tipo especificado
   * @param type Tipo de integração (default: CHECKOUT)
   */
  public getPaymentService(
    type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ): IPaymentService {
    // Verifica se já existe uma instância no cache
    if (!MercadoPagoServiceFactoryImpl.paymentServices.has(type)) {
      // Cria nova instância e armazena no cache
      const service = PaymentFactory.createPaymentService(type);
      MercadoPagoServiceFactoryImpl.paymentServices.set(type, service);
    }

    // Retorna a instância do cache
    return MercadoPagoServiceFactoryImpl.paymentServices.get(type)!;
  }

  /**
   * Obtém serviço de assinatura
   */
  public getSubscriptionService(): ISubscriptionService {
    // Verifica se já existe uma instância no cache
    if (!MercadoPagoServiceFactoryImpl.subscriptionService) {
      // Cria nova instância e armazena no cache
      MercadoPagoServiceFactoryImpl.subscriptionService =
        SubscriptionFactory.createSubscriptionService();
    }

    // Retorna a instância do cache
    return MercadoPagoServiceFactoryImpl.subscriptionService;
  }

  /**
   * Obtém processador de webhook
   */
  public getWebhookProcessor(): IWebhookProcessorService {
    // Verifica se já existe uma instância no cache
    if (!MercadoPagoServiceFactoryImpl.webhookProcessor) {
      // Cria nova instância e armazena no cache
      MercadoPagoServiceFactoryImpl.webhookProcessor = new WebhookService();
    }

    // Retorna a instância do cache
    return MercadoPagoServiceFactoryImpl.webhookProcessor;
  }

  /**
   * Limpa o cache de serviços
   * Útil para testes ou quando há alterações de configuração
   */
  public clearCache(): void {
    MercadoPagoServiceFactoryImpl.paymentServices.clear();
    MercadoPagoServiceFactoryImpl.subscriptionService = null;
    MercadoPagoServiceFactoryImpl.webhookProcessor = null;
  }
}

// Instância singleton da fábrica
export const mercadoPagoServiceFactory = new MercadoPagoServiceFactoryImpl();
