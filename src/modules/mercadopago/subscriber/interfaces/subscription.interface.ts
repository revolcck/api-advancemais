import { MercadoPagoPaymentStatus } from "../../dto/payment.dto";
import {
  SubscriptionResponseDto,
  SubscriptionDetailsDto,
  SubscriptionCheckDto,
  CancelSubscriptionResponseDto,
} from "../../dto/subscription.dto";

/**
 * Interface para operações do serviço de assinatura
 */
export interface ISubscriptionService {
  /**
   * Cria uma nova assinatura
   *
   * @param planId ID do plano a ser assinado
   * @param userId ID do usuário que está assinando
   * @param data Dados adicionais para a assinatura
   */
  createSubscription(
    planId: string,
    userId: string,
    data: {
      paymentMethodId: string;
      couponId?: string;
      backUrl?: string;
      paymentCardId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<SubscriptionResponseDto>;

  /**
   * Obtém detalhes de uma assinatura
   *
   * @param subscriptionId ID da assinatura
   * @param userId ID do usuário (para autorização)
   */
  getSubscriptionDetails(
    subscriptionId: string,
    userId: string
  ): Promise<SubscriptionDetailsDto>;

  /**
   * Lista as assinaturas de um usuário
   *
   * @param userId ID do usuário
   * @param status Filtro por status (opcional)
   */
  listUserSubscriptions(
    userId: string,
    status?: string
  ): Promise<SubscriptionDetailsDto[]>;

  /**
   * Cancela uma assinatura
   *
   * @param subscriptionId ID da assinatura
   * @param userId ID do usuário (para autorização)
   * @param reason Motivo do cancelamento (opcional)
   */
  cancelSubscription(
    subscriptionId: string,
    userId: string,
    reason?: string
  ): Promise<CancelSubscriptionResponseDto>;

  /**
   * Verifica se um usuário tem assinatura ativa
   *
   * @param userId ID do usuário
   */
  checkActiveSubscription(userId: string): Promise<SubscriptionCheckDto>;

  /**
   * Processa uma atualização de assinatura recebida via webhook
   *
   * @param subscriptionId ID da assinatura no MercadoPago
   */
  processSubscriptionUpdate(subscriptionId: string): Promise<void>;

  /**
   * Processa um pagamento de assinatura
   *
   * @param subscriptionId ID da assinatura
   * @param paymentId ID do pagamento
   * @param status Status do pagamento
   */
  processSubscriptionPayment(
    subscriptionId: string,
    paymentId: string,
    status: MercadoPagoPaymentStatus
  ): Promise<void>;

  /**
   * Processa uma atualização de plano recebida via webhook
   *
   * @param planId ID do plano no MercadoPago
   */
  processPlanUpdate(planId: string): Promise<void>;
}
