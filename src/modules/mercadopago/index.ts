/**
 * Módulo principal de integração com o MercadoPago
 * Fornece as funcionalidades essenciais para interação com a API do MercadoPago
 *
 * @module modules/mercadopago
 */

// Configuração
import { mercadoPagoConfig } from "./config/mercadopago.config";
import { credentialsManager } from "./config/credentials";

// Enumerações
import { MercadoPagoIntegrationType } from "./enums";

// Serviço principal
import { mercadoPagoCoreService } from "./services/core.service";

// Adaptadores
import * as Adapters from "./adapters";

// Utils
import * as Utils from "./utils";

// Tipos
import * as Types from "./types";

// Interfaces
import * as Interfaces from "./interfaces";

// Validators
import * as Validators from "./validators/webhook.validators";

/**
 * Verifica se a integração com o MercadoPago está disponível
 * @returns Verdadeiro se o serviço estiver disponível
 */
export function isMercadoPagoAvailable(): boolean {
  return mercadoPagoConfig.isAvailable();
}

/**
 * Verifica se estamos em modo de teste
 * @param type Tipo de integração (opcional)
 * @returns Verdadeiro se estamos usando credenciais de teste
 */
export function isMercadoPagoTestMode(
  type?: MercadoPagoIntegrationType
): boolean {
  return mercadoPagoConfig.isTestMode(type);
}

/**
 * Verifica se o ambiente de teste está habilitado
 * @param type Tipo de integração (opcional)
 * @returns Verdadeiro se o ambiente de teste estiver habilitado
 */
export function isMercadoPagoTestEnabled(
  type?: MercadoPagoIntegrationType
): boolean {
  return mercadoPagoConfig.isTestEnabled(type);
}

/**
 * Obtém a chave pública para uso no frontend
 * @param type Tipo de integração (opcional)
 * @returns Chave pública do MercadoPago
 */
export function getMercadoPagoPublicKey(
  type?: MercadoPagoIntegrationType
): string {
  return mercadoPagoConfig.getPublicKey(type);
}

/**
 * Testa a conectividade com a API do MercadoPago
 * @param type Tipo de integração a testar (opcional)
 * @returns Resultado do teste de conectividade
 */
export async function testMercadoPagoConnectivity(
  type?: MercadoPagoIntegrationType
): Promise<Interfaces.IConnectivityInfo> {
  return mercadoPagoCoreService.testConnectivity(type);
}

/**
 * Obtém o adaptador de pagamento do MercadoPago
 * @param type Tipo de integração (opcional, padrão: CHECKOUT)
 * @returns Adaptador de pagamento
 */
export function getPaymentAdapter(
  type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
): Adapters.PaymentAdapter {
  return mercadoPagoCoreService.getPaymentAdapter(type);
}

/**
 * Obtém o adaptador de preferência do MercadoPago
 * @param type Tipo de integração (opcional, padrão: CHECKOUT)
 * @returns Adaptador de preferência
 */
export function getPreferenceAdapter(
  type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
): Adapters.PreferenceAdapter {
  return mercadoPagoCoreService.getPreferenceAdapter(type);
}

/**
 * Obtém o adaptador de assinatura do MercadoPago
 * @returns Adaptador de assinatura
 */
export function getSubscriptionAdapter(): Adapters.SubscriptionAdapter {
  return mercadoPagoCoreService.getSubscriptionAdapter();
}

/**
 * Obtém o adaptador de ordem de mercador do MercadoPago
 * @param type Tipo de integração (opcional, padrão: CHECKOUT)
 * @returns Adaptador de ordem de mercador
 */
export function getMerchantOrderAdapter(
  type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
): Adapters.MerchantOrderAdapter {
  return mercadoPagoCoreService.getMerchantOrderAdapter(type);
}

/**
 * Limpa o cache de adaptadores
 * Útil quando há mudança de credenciais ou ambiente
 */
export function clearMercadoPagoAdapterCache(): void {
  mercadoPagoCoreService.clearAdapterCache();
}

/**
 * Verifica se um webhook é de teste
 * @param payload Payload do webhook
 * @returns Verdadeiro se o webhook for de teste
 */
export function isTestWebhook(payload: any): boolean {
  return Utils.WebhookValidator.isTestWebhook(payload);
}

/**
 * Cria uma resposta simulada para ambiente de teste
 * @param type Tipo de integração
 * @param resourceType Tipo de recurso (payment, subscription, etc)
 * @param data Dados adicionais para misturar na resposta simulada
 * @returns Objeto simulado para resposta de teste
 */
export function createMockResponse(
  type: MercadoPagoIntegrationType,
  resourceType: string,
  id: string | number,
  data: Record<string, any> = {}
): any {
  const isTest = mercadoPagoConfig.isTestMode(type);
  if (!isTest) return null;

  const now = new Date();
  const nowIso = now.toISOString();

  // Mock base para diferentes tipos de recursos
  if (resourceType === "payment") {
    const releaseDate = new Date(now);
    releaseDate.setDate(now.getDate() + 14);

    return {
      id: Number(id),
      date_created: nowIso,
      date_approved: nowIso,
      date_last_updated: nowIso,
      money_release_date: releaseDate.toISOString(),
      issuer_id: 25,
      payment_method_id: data.payment_method_id || "visa",
      payment_type_id: data.payment_type_id || "credit_card",
      status: data.status || "approved",
      status_detail: data.status_detail || "accredited",
      currency_id: data.currency_id || "BRL",
      description: data.description || "Transação de teste",
      transaction_amount: data.transaction_amount || 100,
      transaction_amount_refunded: data.transaction_amount_refunded || 0,
      transaction_details: {
        net_received_amount: data.transaction_amount
          ? data.transaction_amount * 0.97
          : 97,
        total_paid_amount: data.transaction_amount || 100,
        overpaid_amount: 0,
        installment_amount: data.transaction_amount || 100,
      },
      payer: {
        id: data.payer_id || "test-user",
        email: data.payer_email || "test@example.com",
        identification: {
          type: "CPF",
          number: "12345678909",
        },
        type: "customer",
      },
      installments: data.installments || 1,
      card: {
        first_six_digits: "123456",
        last_four_digits: "1234",
        expiration_month: 12,
        expiration_year: 2025,
        date_created: nowIso,
        date_last_updated: nowIso,
        cardholder: {
          name: "APRO",
          identification: {
            type: "CPF",
            number: "12345678909",
          },
        },
      },
      external_reference: data.external_reference || `ext-ref-${id}`,
      operation_type: "regular_payment",
      ...data,
    };
  } else if (resourceType === "preference") {
    return {
      id: id,
      init_point: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${id}`,
      sandbox_init_point: `https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=${id}`,
      date_created: nowIso,
      date_updated: nowIso,
      external_reference: data.external_reference || `ext-ref-${id}`,
      items: data.items || [
        {
          id: "item-test-1",
          title: "Produto de teste",
          description: "Descrição do produto de teste",
          quantity: 1,
          unit_price: data.transaction_amount || 100,
          currency_id: "BRL",
          picture_url:
            "https://www.mercadopago.com/org-img/MP3/home/logomp3.gif",
        },
      ],
      payer: data.payer || {
        email: "test@example.com",
        name: "Usuário Teste",
        surname: "Sobrenome Teste",
      },
      back_urls: data.back_urls || {
        success: "https://success.test",
        failure: "https://failure.test",
        pending: "https://pending.test",
      },
      auto_return: "approved",
      notification_url:
        data.notification_url || "https://webhook.site/test-webhook",
      expires: false,
      ...data,
    };
  } else if (resourceType === "subscription") {
    const nextPaymentDate = new Date(now);
    nextPaymentDate.setDate(now.getDate() + 30);

    return {
      id: id,
      status: data.status || "authorized",
      init_point: `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${id}`,
      preapproval_plan_id: data.preapproval_plan_id || `plan-${id}`,
      external_reference: data.external_reference || `ext-ref-${id}`,
      payer_id: data.payer_id || 12345,
      payer_email: data.payer_email || "test@example.com",
      back_url: data.back_url || "https://success.test",
      reason: data.reason || "Assinatura de teste",
      auto_recurring: {
        frequency: data.frequency || 1,
        frequency_type: data.frequency_type || "months",
        transaction_amount: data.transaction_amount || 100,
        currency_id: data.currency_id || "BRL",
        start_date: nowIso,
        end_date: undefined,
      },
      date_created: nowIso,
      last_modified: nowIso,
      next_payment_date: nextPaymentDate.toISOString(),
      payment_method_id: data.payment_method_id || "credit_card",
      ...data,
    };
  } else if (resourceType === "merchant_order") {
    return {
      id: id,
      status: data.status || "opened",
      external_reference: data.external_reference || `ext-ref-${id}`,
      preference_id: data.preference_id || `pref-${id}`,
      date_created: nowIso,
      last_updated: nowIso,
      items: data.items || [],
      payments: data.payments || [],
      shipments: data.shipments || [],
      ...data,
    };
  }

  // Tipo de recurso não suportado para simulação
  return {
    id: id,
    date_created: nowIso,
    ...data,
  };
}

// Exporta os membros principais do módulo
export {
  // Configuração
  mercadoPagoConfig,
  credentialsManager,

  // Enumerações
  MercadoPagoIntegrationType,

  // Serviço principal
  mercadoPagoCoreService,

  // Adaptadores
  Adapters,

  // Utils
  Utils,

  // Tipos
  Types,

  // Interfaces
  Interfaces,

  // Validators
  Validators,
};
