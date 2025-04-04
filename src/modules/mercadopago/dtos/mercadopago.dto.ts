/**
 * Data Transfer Objects (DTOs) para o módulo MercadoPago
 * Define a estrutura dos dados para comunicação entre camadas
 *
 * @module modules/mercadopago/dtos/mercadopago.dto
 */

/**
 * Interface base para respostas das operações do MercadoPago
 */
export interface MercadoPagoBaseResponse {
  /** Indica se a operação foi bem-sucedida */
  success: boolean;

  /** Mensagem de erro (quando houver) */
  error?: string;

  /** Código de erro (quando houver) */
  errorCode?: string;

  /** Dados retornados (quando a operação for bem-sucedida) */
  data?: any; // Propriedade adicionada para resolver o erro
}

/**
 * Interface para resposta do teste de conectividade
 */
export interface ConnectivityTestResponse extends MercadoPagoBaseResponse {
  /** Informações da conta */
  account?: {
    id: string;
    email?: string;
    nickname?: string;
    siteId?: string;
  };
}

/**
 * Interface para informações do cliente/pagador
 */
export interface PayerInfo {
  /** Email do cliente */
  email: string;

  /** Nome do cliente (opcional) */
  firstName?: string;

  /** Sobrenome do cliente (opcional) */
  lastName?: string;

  /** Identificação do cliente */
  identification?: {
    /** Tipo de documento (CPF, CNPJ, etc.) */
    type: string;

    /** Número do documento */
    number: string;
  };

  /** Telefone do cliente (opcional) */
  phone?: {
    areaCode: string;
    number: string;
  };

  /** Endereço do cliente (opcional) */
  address?: {
    zipCode: string;
    streetName: string;
    streetNumber: number | string;
    neighborhood?: string;
    city?: string;
    federalUnit?: string;
  };
}

// ===================== DTOs para Pagamentos =====================

/**
 * Interface para criação de um pagamento único
 */
export interface CreatePaymentRequest {
  /** Valor da transação em decimal */
  transactionAmount: number;

  /** Descrição do pagamento */
  description: string;

  /** Identificador do meio de pagamento (visa, mastercard, etc.) */
  paymentMethodId: string;

  /** Informações do pagador/cliente */
  payer: PayerInfo;

  /** Número de parcelas */
  installments?: number;

  /** Token do cartão (para pagamentos com cartão) */
  token?: string;

  /** Referência externa (opcional, para integração com sistemas externos) */
  externalReference?: string;

  /** URL de callback para redirecionamento após pagamento */
  callbackUrl?: string;

  /** ID do usuário logado (para auditoria) */
  userId?: string;

  /** Metadados adicionais (opcional) */
  metadata?: Record<string, any>;
}

/**
 * Interface de resposta para criação de pagamento
 */
export interface CreatePaymentResponse extends MercadoPagoBaseResponse {
  /** ID do pagamento criado */
  paymentId?: string;

  /** Status do pagamento */
  status?: string;

  /** Detalhes do status do pagamento */
  statusDetail?: string;

  /** URL para redirecionamento (quando aplicável) */
  redirectUrl?: string;
}

/**
 * Interface para obter informações de um pagamento
 */
export interface GetPaymentInfoRequest {
  /** ID do pagamento */
  paymentId: string;
}

/**
 * Interface para capturar um pagamento
 */
export interface CapturePaymentRequest {
  /** ID do pagamento */
  paymentId: string;

  /** Valor a ser capturado (opcional, se não informado captura o valor total) */
  amount?: number;
}

/**
 * Interface para cancelar um pagamento
 */
export interface CancelPaymentRequest {
  /** ID do pagamento */
  paymentId: string;
}

// ===================== DTOs para Assinaturas =====================

/**
 * Interface para criação de uma assinatura (pagamento recorrente)
 */
export interface CreateSubscriptionRequest {
  /** Valor da assinatura */
  preapprovalAmount: number;

  /** Nome/título da assinatura */
  preapprovalName: string;

  /** Tipo de assinatura (por padrão, assinatura permanente) */
  autoRecurring: {
    /** Frequência da assinatura */
    frequency: number;

    /** Unidade de frequência (days, months) */
    frequencyType: "days" | "months";

    /** Data de início da assinatura (opcional) */
    startDate?: string;

    /** Data de término da assinatura (opcional) */
    endDate?: string;

    /** Número de repetições (opcional, para assinatura fixa) */
    repetitions?: number;
  };

  /** URL de retorno após o cliente autorizar a assinatura */
  backUrl: string;

  /** Idenficiador externo (opcional) */
  externalReference?: string;

  /** Informações do assinante */
  payer: PayerInfo;

  /** Motivo/descrição da assinatura */
  reason?: string;

  /** ID do usuário logado (para auditoria) */
  userId?: string;
}

/**
 * Interface de resposta para criação de assinatura
 */
export interface CreateSubscriptionResponse extends MercadoPagoBaseResponse {
  /** ID da assinatura criada */
  subscriptionId?: string;

  /** Código de status HTTP */
  status?: number;

  /** URL para o cliente autorizar a assinatura */
  initPoint?: string;
}

/**
 * Interface para obter informações de uma assinatura
 */
export interface GetSubscriptionInfoRequest {
  /** ID da assinatura */
  subscriptionId: string;
}

/**
 * Interface para cancelar uma assinatura
 */
export interface CancelSubscriptionRequest {
  /** ID da assinatura */
  subscriptionId: string;
}

/**
 * Interface para pause/resume de uma assinatura
 */
export interface UpdateSubscriptionStatusRequest {
  /** ID da assinatura */
  subscriptionId: string;

  /** Novo status (paused/authorized) */
  status: "paused" | "authorized";
}

/**
 * Interface para atualizar o valor de uma assinatura
 */
export interface UpdateSubscriptionAmountRequest {
  /** ID da assinatura */
  subscriptionId: string;

  /** Novo valor da assinatura */
  amount: number;
}

// ===================== DTOs para Webhooks =====================

/**
 * Interface para webhook de notificações
 */
export interface WebhookNotificationRequest {
  /** Tipo da notificação */
  type: string;

  /** Data da notificação */
  date_created: string;

  /** ID do recurso associado à notificação */
  id?: string;

  /** Dados específicos da notificação */
  data?: {
    id: string;
    [key: string]: any;
  };
}

/**
 * Interface para resposta de processamento de webhook
 */
export interface WebhookResponse extends MercadoPagoBaseResponse {
  /** Tipo da notificação processada */
  type?: string;

  /** ID do recurso processado */
  resourceId?: string;
}

// ===================== DTOs para Preferências de Pagamento =====================

/**
 * Interface para criação de preferência de pagamento
 */
export interface CreatePreferenceRequest {
  /** Itens incluídos na preferência */
  items: Array<{
    id: string;
    title: string;
    description?: string;
    pictureUrl?: string;
    categoryId?: string;
    quantity: number;
    unitPrice: number;
    currencyId?: string;
  }>;

  /** Informações do pagador (opcional) */
  payer?: PayerInfo;

  /** URL de retorno após o pagamento */
  backUrls?: {
    success?: string;
    pending?: string;
    failure?: string;
  };

  /** URL para notificações webhook */
  notificationUrl?: string;

  /** Identificador externo (opcional) */
  externalReference?: string;

  /** Auto retorno após pagamento */
  autoReturn?: "approved" | "all";

  /** Métodos de pagamento excluídos (opcional) */
  excludedPaymentMethods?: Array<{ id: string }>;

  /** Tipos de pagamento excluídos (opcional) */
  excludedPaymentTypes?: Array<{ id: string }>;

  /** Data de expiração da preferência (opcional) */
  expirationDateFrom?: string;
  expirationDateTo?: string;

  /** ID do usuário logado (para auditoria) */
  userId?: string;
}

/**
 * Interface de resposta para criação de preferência
 */
export interface CreatePreferenceResponse extends MercadoPagoBaseResponse {
  /** ID da preferência criada */
  preferenceId?: string;

  /** URL para iniciar o fluxo de pagamento */
  initPoint?: string;

  /** URL para iniciar o fluxo de pagamento em sandbox */
  sandboxInitPoint?: string;
}
