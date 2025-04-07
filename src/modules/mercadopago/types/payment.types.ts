/**
 * Tipos relacionados a pagamentos do MercadoPago
 * @module modules/mercadopago/types/payment.types
 */

/**
 * Status possíveis de um pagamento
 */
export enum PaymentStatus {
  PENDING = "pending",
  APPROVED = "approved",
  AUTHORIZED = "authorized",
  IN_PROCESS = "in_process",
  IN_MEDIATION = "in_mediation",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
  CHARGED_BACK = "charged_back",
}

/**
 * Item para pagamento
 */
export interface PaymentItem {
  /** ID do item */
  id: string;

  /** Título do item */
  title: string;

  /** Descrição do item (opcional) */
  description?: string;

  /** URL da imagem (opcional) */
  picture_url?: string;

  /** ID da categoria (opcional) */
  category_id?: string;

  /** Quantidade */
  quantity: number;

  /** Preço unitário */
  unit_price: number;

  /** Moeda (opcional, default: BRL) */
  currency_id?: string;
}

/**
 * Dados para criação de pagamento
 */
export interface PaymentCreateData {
  /** Valor da transação */
  transaction_amount: number;

  /** Descrição do pagamento */
  description: string;

  /** ID do método de pagamento */
  payment_method_id: string;

  /** Informações do pagador */
  payer: {
    /** Email do pagador */
    email: string;

    /** Nome do pagador (opcional) */
    first_name?: string;

    /** Sobrenome do pagador (opcional) */
    last_name?: string;

    /** Documento de identificação (opcional) */
    identification?: {
      /** Tipo de documento */
      type: string;

      /** Número do documento */
      number: string;
    };

    /** Tipo de pessoa (opcional) */
    type?: string;
  };

  /** Número de parcelas (opcional, default: 1) */
  installments?: number;

  /** Token do cartão (para pagamentos com cartão) */
  token?: string;

  /** ID do emissor (opcional) */
  issuer_id?: string;

  /** Referência externa (opcional) */
  external_reference?: string;

  /** URL de callback (opcional) */
  callback_url?: string;

  /** Informações adicionais (opcional) */
  additional_info?: {
    /** Itens do pagamento */
    items?: PaymentItem[];

    /** Informações do comprador (opcional) */
    payer?: {
      /** Nome completo */
      first_name: string;

      /** Sobrenome */
      last_name: string;

      /** Telefone */
      phone?: {
        /** Código de área */
        area_code: string;

        /** Número de telefone */
        number: string;
      };

      /** Endereço */
      address?: {
        /** CEP */
        zip_code: string;

        /** Nome da rua */
        street_name: string;

        /** Número */
        street_number: string;
      };
    };

    /** Informações de envio (opcional) */
    shipments?: {
      /** Método de envio */
      receiver_address: {
        /** CEP */
        zip_code: string;

        /** Nome da rua */
        street_name: string;

        /** Número */
        street_number: string;

        /** Andar */
        floor?: string;

        /** Apartamento */
        apartment?: string;
      };
    };
  };

  /** URL de notificação (opcional) */
  notification_url?: string;

  /** Metadados (opcional) */
  metadata?: Record<string, any>;

  /** Dados adicionais */
  [key: string]: any;
}

/**
 * Resposta de criação/obtenção de pagamento
 */
export interface PaymentResponse {
  /** ID do pagamento */
  id: number;

  /** Data de criação */
  date_created: string;

  /** Data de aprovação (opcional) */
  date_approved?: string;

  /** Data da última atualização */
  date_last_updated: string;

  /** Data de expiração (opcional) */
  date_of_expiration?: string;

  /** Data de liberação do dinheiro (opcional) */
  money_release_date?: string;

  /** ID da operação */
  operation_type: string;

  /** ID do emissor */
  issuer_id?: string;

  /** ID do método de pagamento */
  payment_method_id: string;

  /** ID do tipo de pagamento */
  payment_type_id: string;

  /** Status do pagamento */
  status: string;

  /** Detalhes do status */
  status_detail: string;

  /** Moeda */
  currency_id: string;

  /** Valor da transação */
  transaction_amount: number;

  /** Valor de renda líquida */
  transaction_amount_refunded: number;

  /** Valor pago */
  transaction_details: {
    /** Valor líquido recebido */
    net_received_amount: number;

    /** Valor total pago */
    total_paid_amount: number;

    /** Valor da sobretaxa */
    overpaid_amount: number;

    /** Identificador externo */
    external_resource_url?: string;

    /** Boleto bancário */
    installment_amount?: number;

    /** ID da conta financeira */
    financial_institution?: string;

    /** Método de pagamento */
    payment_method_reference_id?: string;
  };

  /** Informações do cartão */
  card?: {
    /** ID do cartão */
    id?: string;

    /** Últimos quatro dígitos */
    last_four_digits: string;

    /** Primeiros seis dígitos */
    first_six_digits: string;

    /** Mês de expiração */
    expiration_month: number;

    /** Ano de expiração */
    expiration_year: number;

    /** Data de criação */
    date_created: string;

    /** Data da última atualização */
    date_last_updated: string;

    /** Nome do titular */
    cardholder: {
      /** Nome */
      name: string;

      /** Identificação */
      identification: {
        /** Tipo */
        type: string;

        /** Número */
        number: string;
      };
    };
  };

  /** Capturar pagamento */
  capture: boolean;

  /** ID externo do pagamento */
  external_reference?: string;

  /** Detalhes do pagador */
  payer: {
    /** ID do pagador */
    id?: string;

    /** Email */
    email: string;

    /** Identificação */
    identification?: {
      /** Tipo */
      type: string;

      /** Número */
      number: string;
    };

    /** Tipo */
    type?: string;
  };

  /** Número de parcelas */
  installments: number;

  /** Dados adicionais */
  [key: string]: any;
}

/**
 * Critérios de pesquisa para pagamentos
 */
export interface PaymentSearchCriteria {
  /** Referência externa */
  external_reference?: string;

  /** Período de datas */
  range?: string;

  /** Data de início */
  begin_date?: string;

  /** Data de fim */
  end_date?: string;

  /** Status do pagamento */
  status?: string | string[];

  /** ID do método de pagamento */
  payment_method_id?: string;

  /** ID do tipo de pagamento */
  payment_type_id?: string;

  /** ID da operação */
  operation_type?: string;

  /** ID do emissor */
  issuer_id?: string;

  /** ID da ordem do mercador */
  merchant_order_id?: string;

  /** Limite de resultados */
  limit?: number;

  /** Deslocamento dos resultados */
  offset?: number;

  /** Campo para ordenação */
  sort?: string;

  /** Critério de ordenação */
  criteria?: "asc" | "desc";

  /** Email do pagador */
  payer_email?: string;

  /** Dados adicionais */
  [key: string]: any;
}

/**
 * Resultado da pesquisa de pagamentos
 */
export interface PaymentSearchResult {
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
  results: PaymentResponse[];
}

/**
 * Dados para reembolso de pagamento
 */
export interface PaymentRefundData {
  /** Valor do reembolso (opcional para reembolso total) */
  amount?: number;
}

/**
 * Dados para captura de pagamento
 */
export interface PaymentCaptureData {
  /** Valor a ser capturado */
  amount?: number;
}

/**
 * Item para uma preferência de pagamento
 */
export interface PreferenceItem {
  /** ID do item */
  id: string;

  /** Título do item */
  title: string;

  /** Descrição do item (opcional) */
  description?: string;

  /** URL da imagem (opcional) */
  picture_url?: string;

  /** ID da categoria (opcional) */
  category_id?: string;

  /** Quantidade */
  quantity: number;

  /** Preço unitário */
  unit_price: number;

  /** Moeda (opcional) */
  currency_id?: string;
}

/**
 * URLs de retorno após o pagamento
 */
export interface BackUrls {
  /** URL para redirecionamento em caso de sucesso */
  success?: string;

  /** URL para redirecionamento em caso de pagamento pendente */
  pending?: string;

  /** URL para redirecionamento em caso de falha */
  failure?: string;
}

/**
 * Dados para criação de uma preferência
 */
export interface PreferenceData {
  /** Itens da preferência */
  items: PreferenceItem[];

  /** Informações do pagador */
  payer?: {
    /** Nome do pagador */
    name?: string;

    /** Sobrenome do pagador */
    surname?: string;

    /** Email do pagador */
    email: string;

    /** Telefone */
    phone?: {
      /** Código de área */
      area_code: string;

      /** Número */
      number: string;
    };

    /** Identificação */
    identification?: {
      /** Tipo */
      type: string;

      /** Número */
      number: string;
    };

    /** Endereço */
    address?: {
      /** CEP */
      zip_code: string;

      /** Rua */
      street_name: string;

      /** Número */
      street_number: string;
    };
  };

  /** URLs de retorno */
  back_urls?: BackUrls;

  /** Redirecionamento automático */
  auto_return?: "approved" | "all";

  /** URL de notificação */
  notification_url?: string;

  /** Referência externa */
  external_reference?: string;

  /** Indica se a preferência expira */
  expires?: boolean;

  /** Data de início da expiração */
  expiration_date_from?: string;

  /** Data de fim da expiração */
  expiration_date_to?: string;

  /** Métodos de pagamento excluídos */
  excluded_payment_methods?: Array<{ id: string }>;

  /** Tipos de pagamento excluídos */
  excluded_payment_types?: Array<{ id: string }>;

  /** Dados adicionais */
  [key: string]: any;
}

/**
 * Resposta de criação/obtenção de preferência
 */
export interface PreferenceResponse {
  /** ID da preferência */
  id: string;

  /** URL de inicialização do checkout */
  init_point: string;

  /** URL de inicialização do checkout em modo sandbox */
  sandbox_init_point: string;

  /** Data de criação */
  date_created: string;

  /** Referência externa */
  external_reference?: string;

  /** Itens da preferência */
  items: PreferenceItem[];

  /** Informações do pagador */
  payer: {
    /** Nome */
    name?: string;

    /** Sobrenome */
    surname?: string;

    /** Email */
    email: string;

    /** Telefone */
    phone?: {
      /** Código de área */
      area_code: string;

      /** Número */
      number: string;
    };

    /** Identificação */
    identification?: {
      /** Tipo */
      type: string;

      /** Número */
      number: string;
    };

    /** Endereço */
    address?: {
      /** CEP */
      zip_code: string;

      /** Rua */
      street_name: string;

      /** Número */
      street_number: string;
    };
  };

  /** Data de expiração */
  expiration_date_from?: string;
  expiration_date_to?: string;

  /** URLs de retorno */
  back_urls?: BackUrls;

  /** Redirecionamento automático */
  auto_return?: string;

  /** URL de notificação */
  notification_url?: string;

  /** Métodos de pagamento excluídos */
  excluded_payment_methods?: Array<{ id: string }>;

  /** Tipos de pagamento excluídos */
  excluded_payment_types?: Array<{ id: string }>;

  /** Dados adicionais */
  [key: string]: any;
}

/**
 * Critérios de pesquisa para preferências
 */
export interface PreferenceSearchCriteria {
  /** Referência externa */
  external_reference?: string;

  /** Limite de resultados */
  limit?: number;

  /** Deslocamento dos resultados */
  offset?: number;

  /** Dados adicionais */
  [key: string]: any;
}

/**
 * Resultado da pesquisa de preferências
 */
export interface PreferenceSearchResult {
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
  results: PreferenceResponse[];
}
