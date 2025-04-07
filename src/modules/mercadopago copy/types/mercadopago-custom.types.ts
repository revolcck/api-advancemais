/**
 * Item para uma preferência de pagamento
 */
export interface PreferenceItem {
  id: string;
  title: string;
  description?: string;
  picture_url?: string;
  category_id?: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

/**
 * Informações do pagador para uma preferência
 */
export interface PreferencePayer {
  name?: string;
  surname?: string;
  email: string;
  identification?: {
    type: string;
    number: string;
  };
  phone?: {
    area_code: string;
    number: string;
  };
  address?: {
    zip_code: string;
    street_name: string;
    street_number: string; // Importante: deve ser string
  };
}

/**
 * URLs de retorno após o pagamento
 */
export interface BackUrls {
  success?: string;
  pending?: string;
  failure?: string;
}

/**
 * Dados para criação de uma preferência
 */
export interface PreferenceData {
  items: PreferenceItem[];
  payer?: PreferencePayer;
  back_urls?: BackUrls;
  auto_return?: "approved" | "all";
  notification_url?: string;
  external_reference?: string;
  expires?: boolean;
  expiration_date_from?: string;
  expiration_date_to?: string;
  excluded_payment_methods?: Array<{ id: string }>;
  excluded_payment_types?: Array<{ id: string }>;
  [key: string]: any;
}

/**
 * Resposta de criação de uma preferência
 */
export interface PreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  [key: string]: any;
}

/**
 * Critérios de pesquisa para preferências
 */
export interface PreferenceSearchCriteria {
  external_reference?: string;
  limit?: number;
  offset?: number;
  [key: string]: any;
}

/**
 * Resultado de pesquisa de preferências
 */
export interface PreferenceSearchResult {
  paging: {
    total: number;
    limit: number;
    offset: number;
  };
  results: PreferenceResponse[];
}
