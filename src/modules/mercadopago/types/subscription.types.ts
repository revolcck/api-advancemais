/**
 * Tipos relacionados a assinaturas do MercadoPago
 * @module modules/mercadopago/types/subscription.types
 */

/**
 * Status possíveis de uma assinatura
 */
export enum SubscriptionStatus {
  PENDING = "pending",
  AUTHORIZED = "authorized",
  PAUSED = "paused",
  CANCELLED = "cancelled",
  ENDED = "ended",
}

/**
 * Tipo de frequência para cobrança recorrente
 */
export enum BillingFrequency {
  DAYS = "days",
  MONTHS = "months",
}

/**
 * Configuração de recorrência para assinatura
 */
export interface AutoRecurring {
  /** Frequência numérica (ex: 1, 3, 6, 12) */
  frequency: number;

  /** Tipo de frequência (dias ou meses) */
  frequency_type: BillingFrequency | "days" | "months";

  /** Data de início (opcional) */
  start_date?: string | number;

  /** Data de término (opcional) */
  end_date?: string | number;

  /** Valor da cobrança recorrente */
  transaction_amount: number;

  /** Moeda (opcional, default: BRL) */
  currency_id?: string;

  /** Dados adicionais */
  [key: string]: any;
}

/**
 * Dados para criação de uma assinatura
 */
export interface SubscriptionCreateData {
  /** ID do plano de pré-aprovação (opcional) */
  preapproval_plan_id?: string;

  /** Motivo ou descrição da assinatura */
  reason?: string;

  /** Referência externa (opcional) */
  external_reference?: string;

  /** Email do pagador */
  payer_email: string;

  /** Configuração de recorrência */
  auto_recurring: AutoRecurring;

  /** URL de retorno após autorização */
  back_url?: string;

  /** Status inicial (default: "pending") */
  status?: "pending" | "authorized" | "paused" | "cancelled";

  /** ID do token de cartão (para pagamento com cartão) */
  card_token_id?: string;

  /** Dados adicionais */
  [key: string]: any;
}

/**
 * Dados para atualização de uma assinatura
 */
export interface SubscriptionUpdateData {
  /** Novo status da assinatura */
  status?: "authorized" | "paused" | "cancelled";

  /** Novas configurações de recorrência */
  auto_recurring?: Partial<AutoRecurring>;

  /** Novo motivo ou descrição */
  reason?: string;

  /** Novo token de cartão */
  card_token_id?: string;

  /** Dados adicionais */
  [key: string]: any;
}

/**
 * Resposta da API de assinaturas
 */
export interface SubscriptionResponse {
  /** ID da assinatura */
  id: string;

  /** Status da assinatura */
  status: string;

  /** URL para iniciar a autorização */
  init_point?: string;

  /** ID do plano de pré-aprovação */
  preapproval_plan_id?: string;

  /** Referência externa */
  external_reference?: string;

  /** ID do pagador */
  payer_id?: number;

  /** Email do pagador */
  payer_email?: string;

  /** Configuração de recorrência */
  auto_recurring?: AutoRecurring;

  /** ID da aplicação */
  application_id?: number;

  /** Data de criação */
  date_created: string | number;

  /** Data da última modificação */
  last_modified: string | number;

  /** Data do próximo pagamento */
  next_payment_date?: string | number;

  /** ID do método de pagamento */
  payment_method_id?: string;

  /** Dados adicionais */
  [key: string]: any;
}

/**
 * Critérios de pesquisa para assinaturas
 */
export interface SubscriptionSearchCriteria {
  /** ID do plano de pré-aprovação */
  preapproval_plan_id?: string;

  /** Referência externa */
  external_reference?: string;

  /** Email do pagador */
  payer_email?: string;

  /** Status da assinatura */
  status?: string;

  /** Limite de resultados */
  limit?: number;

  /** Deslocamento dos resultados */
  offset?: number;

  /** Dados adicionais */
  [key: string]: any;
}

/**
 * Resultado da pesquisa de assinaturas
 */
export interface SubscriptionSearchResult {
  /** Informações de paginação */
  paging: {
    /** Total de resultados */
    total: number;

    /** Limite de resultados por página */
    limit: number;

    /** Deslocamento atual */
    offset: number;
  };

  /** Lista de resultados */
  results: SubscriptionResponse[];

  /** Dados adicionais */
  [key: string]: any;
}
