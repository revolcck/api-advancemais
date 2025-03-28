/**
 * Interface base para respostas das operações do Mercado Pago
 */
export interface MercadoPagoBaseResponse {
  /** Indica se a operação foi bem-sucedida */
  success: boolean;

  /** Mensagem de erro (quando houver) */
  error?: string;

  /** Código de erro (quando houver) */
  errorCode?: string;
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

  /** Dados completos do pagamento retornado pela API */
  data?: any;
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

  /** Dados completos da assinatura retornada pela API */
  data?: any;
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

  /** Dados adicionais (opcional) */
  data?: any;
}
