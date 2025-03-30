/**
 * Tipos personalizados para a API de assinaturas do MercadoPago
 * Define interfaces compatíveis com a API, mas sem os problemas de tipagem do SDK
 *
 * NOTA IMPORTANTE: Estas interfaces são aproximações dos tipos reais da API do MercadoPago.
 * Foram criadas como solução para lidar com a tipagem inconsistente do SDK oficial.
 * Para informações mais precisas, consulte a documentação oficial do MercadoPago.
 *
 * @module modules/mercadopago/types/subscription-custom.types
 */

/**
 * Configuração de recorrência para assinatura
 */
export interface AutoRecurring {
  frequency: number;
  frequency_type: "days" | "months";
  start_date?: string | number;
  end_date?: string | number;
  transaction_amount: number;
  currency_id?: string;
}

/**
 * Dados para criação de uma assinatura (preApproval)
 */
export interface SubscriptionCreateData {
  preapproval_plan_id?: string;
  reason?: string;
  external_reference?: string;
  payer_email: string;
  auto_recurring: AutoRecurring;
  back_url?: string;
  status?: "pending" | "authorized" | "paused" | "cancelled";
  card_token_id?: string;
  [key: string]: any;
}

/**
 * Dados para atualização de uma assinatura
 */
export interface SubscriptionUpdateData {
  status?: "authorized" | "paused" | "cancelled";
  auto_recurring?: Partial<AutoRecurring>;
  reason?: string;
  card_token_id?: string;
  [key: string]: any;
}

/**
 * Resposta da API de assinaturas
 * Nota: Os campos de data podem ser retornados como string ou número (timestamp)
 */
export interface SubscriptionResponse {
  id: string;
  status: string;
  init_point?: string;
  preapproval_plan_id?: string;
  external_reference?: string;
  payer_id?: number;
  payer_email?: string;
  auto_recurring?: AutoRecurring;
  application_id?: number;
  date_created: string | number; // Pode ser string ou timestamp
  last_modified: string | number; // Pode ser string ou timestamp
  next_payment_date?: string | number; // Pode ser string ou timestamp
  payment_method_id?: string;
  [key: string]: any;
}

/**
 * Critérios de pesquisa para assinaturas
 */
export interface SubscriptionSearchCriteria {
  preapproval_plan_id?: string;
  external_reference?: string;
  payer_email?: string;
  status?: string;
  limit?: number;
  offset?: number;
  [key: string]: any;
}

/**
 * Resultado de pesquisa de assinaturas
 */
export interface SubscriptionSearchResult {
  paging: {
    total: number;
    limit: number;
    offset: number;
  };
  results: SubscriptionResponse[];
  [key: string]: any;
}
