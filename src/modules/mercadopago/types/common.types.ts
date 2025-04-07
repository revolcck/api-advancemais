/**
 * Tipos comuns compartilhados para integração com MercadoPago
 * @module modules/mercadopago/types/common.types
 */

/**
 * Resposta base para operações do MercadoPago
 */
export interface MercadoPagoBaseResponse {
  /** Indica se a operação foi bem-sucedida */
  success: boolean;

  /** Mensagem de erro (quando houver) */
  error?: string;

  /** Código de erro (quando houver) */
  errorCode?: string;

  /** Dados retornados (quando a operação for bem-sucedida) */
  data?: any;
}

/**
 * Informações do pagador/cliente
 */
export interface PayerInfo {
  /** Email do cliente */
  email: string;

  /** Nome do cliente (opcional) */
  name?: string;

  /** Sobrenome do cliente (opcional) */
  surname?: string;

  /** Primeiro nome do cliente (opcional, para APIs específicas) */
  first_name?: string;

  /** Sobrenome do cliente (opcional, para APIs específicas) */
  last_name?: string;

  /** Identificação do cliente */
  identification?: {
    /** Tipo de documento */
    type: string;

    /** Número do documento */
    number: string;
  };

  /** Telefone do cliente (opcional) */
  phone?: {
    /** Código de área */
    area_code: string;

    /** Número do telefone */
    number: string;
  };

  /** Endereço do cliente (opcional) */
  address?: {
    /** CEP */
    zip_code: string;

    /** Nome da rua */
    street_name: string;

    /** Número */
    street_number: string | number;

    /** Bairro (opcional) */
    neighborhood?: string;

    /** Cidade (opcional) */
    city?: string;

    /** Estado (opcional) */
    federal_unit?: string;
  };
}

/**
 * Interface para informações de conectividade
 */
export interface ConnectivityInfo {
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
 * Resultado de obtenção de ordem de mercador
 */
export interface MerchantOrderResponse {
  /** ID da ordem */
  id: string | number;

  /** Status da ordem */
  status: string;

  /** Referência externa */
  external_reference?: string;

  /** ID da preferência associada */
  preference_id?: string;

  /** Pagamentos associados à ordem */
  payments?: any[];

  /** Dados de envio */
  shipments?: any[];

  /** Itens da ordem */
  items?: any[];

  /** Data de criação */
  date_created: string | number;

  /** Data da última atualização */
  last_updated: string | number;

  /** Campos adicionais */
  [key: string]: any;
}

/**
 * Notificação de webhook genérica
 */
export interface WebhookNotification {
  /** Tipo da notificação */
  type: string;

  /** Data de criação */
  date_created: string | number;

  /** ID da notificação */
  id?: string;

  /** Dados da notificação */
  data?: {
    /** ID do recurso */
    id: string;

    /** Campos adicionais */
    [key: string]: any;
  };

  /** Campos adicionais */
  [key: string]: any;
}

/**
 * Resposta para processamento de webhook
 */
export interface WebhookProcessResponse {
  /** Indica se o processamento foi bem-sucedido */
  success: boolean;

  /** Tipo de webhook processado */
  type?: string;

  /** ID do recurso processado */
  resourceId?: string;

  /** Mensagem informativa */
  message?: string;

  /** Dados de retorno */
  data?: any;

  /** Mensagem de erro (quando houver) */
  error?: string;

  /** Código de erro (quando houver) */
  errorCode?: string;
}
