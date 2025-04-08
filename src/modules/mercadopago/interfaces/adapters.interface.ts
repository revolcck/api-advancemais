/**
 * Interfaces para adaptadores do MercadoPago
 * @module modules/mercadopago/interfaces/adapters.interface
 */

import {
  PaymentCaptureData,
  PaymentCreateData,
  PaymentRefundData,
  PaymentResponse,
  PaymentSearchCriteria,
  PaymentSearchResult,
  PreferenceData,
  PreferenceResponse,
  PreferenceSearchCriteria,
  PreferenceSearchResult,
} from "../types/payment.types";
import {
  SubscriptionCreateData,
  SubscriptionResponse,
  SubscriptionSearchCriteria,
  SubscriptionSearchResult,
  SubscriptionUpdateData,
} from "../types/subscription.types";
import { MerchantOrderResponse } from "../types/common.types";

/**
 * Interface para adaptador de pagamento
 */
export interface IPaymentAdapter {
  create(data: PaymentCreateData): Promise<PaymentResponse>;
  get(id: string | number): Promise<PaymentResponse>;
  refund(id: string | number, data?: PaymentRefundData): Promise<any>;
  capture(id: string | number, data?: PaymentCaptureData): Promise<any>;
  cancel(id: string | number): Promise<any>;
  search(criteria: PaymentSearchCriteria): Promise<PaymentSearchResult>;
}

/**
 * Interface para adaptador de preferência
 */
export interface IPreferenceAdapter {
  create(data: PreferenceData): Promise<PreferenceResponse>;
  get(id: string): Promise<PreferenceResponse>;
  update(
    id: string,
    data: Partial<PreferenceData>
  ): Promise<PreferenceResponse>;
  search(criteria: PreferenceSearchCriteria): Promise<PreferenceSearchResult>;
}

/**
 * Interface para adaptador de assinatura
 */
export interface ISubscriptionAdapter {
  create(data: SubscriptionCreateData): Promise<SubscriptionResponse>;
  get(id: string): Promise<SubscriptionResponse>;
  update(
    id: string,
    data: SubscriptionUpdateData
  ): Promise<SubscriptionResponse>;
  search(
    criteria: SubscriptionSearchCriteria
  ): Promise<SubscriptionSearchResult>;
}

/**
 * Interface para adaptador de ordem de mercador
 */
export interface IMerchantOrderAdapter {
  get(id: string | number): Promise<MerchantOrderResponse>;
  getByPreference(preferenceId: string): Promise<MerchantOrderResponse | null>;
}
