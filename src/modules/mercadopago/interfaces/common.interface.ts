/**
 * Interfaces comuns para o módulo MercadoPago
 * @module modules/mercadopago/interfaces/common.interface
 */

import { MercadoPagoIntegrationType } from "../enums";
import {
  WebhookNotification,
  WebhookProcessResponse,
} from "../types/common.types";
import {
  IPaymentAdapter,
  IPreferenceAdapter,
  IMerchantOrderAdapter,
  ISubscriptionAdapter,
} from "./adapters.interface";

/**
 * Interface para informações de conectividade
 */
export interface IConnectivityInfo {
  /** Indica se o serviço está conectado */
  success: boolean;

  /** Informações da conta (quando conectado) */
  account?: {
    /** ID da conta */
    id: string;

    /** Email associado à conta */
    email?: string;

    /** Nome de usuário */
    nickname?: string;

    /** ID do site (país) */
    siteId?: string;
  };

  /** Mensagem de erro (quando houver) */
  error?: string;

  /** Código de erro (quando houver) */
  errorCode?: string;
}

/**
 * Interface para processador de webhook
 */
export interface IWebhookProcessor {
  /**
   * Processa um webhook do MercadoPago
   */
  processWebhook(
    notification: WebhookNotification
  ): Promise<WebhookProcessResponse>;
}

/**
 * Interface para o serviço core do MercadoPago
 */
export interface IMercadoPagoCoreService {
  /**
   * Testa a conectividade com a API do MercadoPago
   */
  testConnectivity(
    type?: MercadoPagoIntegrationType
  ): Promise<IConnectivityInfo>;

  /**
   * Formata um erro do MercadoPago para log e retorno
   */
  formatError(
    error: any,
    operation: string
  ): { message: string; code: string; details: any };

  /**
   * Obtém o adaptador de pagamento
   */
  getPaymentAdapter(type?: MercadoPagoIntegrationType): IPaymentAdapter;

  /**
   * Obtém o adaptador de preferência
   */
  getPreferenceAdapter(type?: MercadoPagoIntegrationType): IPreferenceAdapter;

  /**
   * Obtém o adaptador de assinatura
   */
  getSubscriptionAdapter(): ISubscriptionAdapter;

  /**
   * Obtém o adaptador de ordem de mercador
   */
  getMerchantOrderAdapter(
    type?: MercadoPagoIntegrationType
  ): IMerchantOrderAdapter;
}
