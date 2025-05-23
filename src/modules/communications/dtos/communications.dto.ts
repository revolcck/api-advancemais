/**
 * Interface para opções de envio de email
 */
export interface EmailOptions {
  /** Assunto do email */
  subject: string;

  /** Conteúdo HTML do email */
  htmlContent?: string;

  /** Conteúdo em texto plano do email */
  textContent?: string;

  /** Email ou lista de emails de destinatários */
  to: string | Array<{ email: string; name?: string }>;

  /** Nome do destinatário (quando to for string) */
  toName?: string;

  /** Email do remetente (opcional, usa o padrão se não informado) */
  senderEmail?: string;

  /** Nome do remetente (opcional, usa o padrão se não informado) */
  senderName?: string;

  /** Email para resposta */
  replyTo?: string;

  /** Nome do email para resposta */
  replyToName?: string;

  /** Email ou lista de emails em cópia */
  cc?: string | Array<{ email: string; name?: string }>;

  /** Email ou lista de emails em cópia oculta */
  bcc?: string | Array<{ email: string; name?: string }>;

  /** Parâmetros para substituição em templates */
  params?: Record<string, any>;

  /** Anexos */
  attachments?: Array<{
    content: string; // Conteúdo em base64
    name: string; // Nome do arquivo
    contentType?: string; // MIME type do arquivo
  }>;

  /** Headers personalizados */
  headers?: Record<string, string>;

  /** ID do usuário que está enviando o email (para auditoria) */
  userId?: string;
}

/**
 * Interface para resposta de envio de email
 */
export interface EmailResponse {
  /** Indica se o email foi enviado com sucesso */
  success: boolean;

  /** ID da mensagem (quando enviada com sucesso) */
  messageId?: string;

  /** Mensagem de erro (quando houver falha) */
  error?: string;

  /** Código de erro (quando houver falha) */
  errorCode?: string;
}

/**
 * Interface para opções de envio de SMS
 */
export interface SmsOptions {
  /** Número de telefone do destinatário (formato internacional: +5511987654321) */
  phoneNumber: string;

  /** Conteúdo da mensagem SMS */
  content: string;

  /** Nome do remetente (opcional, usa o padrão se não informado) */
  sender?: string;

  /** Tipo de SMS (marketing ou transactional) */
  type?: "marketing" | "transactional";

  /** Tag para categorização */
  tag?: string;

  /** URL para redirecionamento quando aplicável */
  webUrl?: string;

  /** ID do usuário que está enviando o SMS (para auditoria) */
  userId?: string;
}

/**
 * Interface para resposta de envio de SMS
 */
export interface SmsResponse {
  /** Indica se o SMS foi enviado com sucesso */
  success: boolean;

  /** ID da mensagem (quando enviada com sucesso) */
  messageId?: string;

  /** Número de créditos restantes na conta */
  remainingCredits?: number;

  /** Mensagem de erro (quando houver falha) */
  error?: string;

  /** Código de erro (quando houver falha) */
  errorCode?: string;
}

/**
 * Interface para opções de envio de WhatsApp
 */
export interface WhatsAppOptions {
  /** Número de telefone do destinatário (formato internacional: +5511987654321) */
  phoneNumber: string;

  /** Conteúdo da mensagem (obrigatório quando não usar template) */
  content?: string;

  /** ID do sender na plataforma Brevo */
  sender?: string;

  /** ID do template na plataforma Brevo */
  templateId?: number;

  /** Parâmetros para substituição no template */
  params?: Record<string, string>;

  /** ID do usuário que está enviando a mensagem (para auditoria) */
  userId?: string;
}

/**
 * Interface para resposta de envio de WhatsApp
 */
export interface WhatsAppResponse {
  /** Indica se a mensagem foi enviada com sucesso */
  success: boolean;

  /** ID da mensagem (quando enviada com sucesso) */
  messageId?: string;

  /** Dados adicionais da resposta */
  data?: any;

  /** Mensagem de erro (quando houver falha) */
  error?: string;

  /** Código de erro (quando houver falha) */
  errorCode?: string;

  /** Status HTTP (opcional) */
  status?: number;
}

/**
 * Interface para teste de conectividade
 */
export interface ConnectivityTestResponse {
  /** Indica se o teste foi bem sucedido */
  success: boolean;

  /** Informações da conta (quando disponível) */
  account?: {
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
  };

  /** Mensagem de erro (quando houver falha) */
  error?: string;

  /** Código de erro (quando houver falha) */
  errorCode?: string;
}

/**
 * Interface para resposta de templates WhatsApp
 */
export interface WhatsAppTemplatesResponse {
  /** Indica se a consulta foi bem sucedida */
  success: boolean;

  /** Templates encontrados */
  templates?: Array<any>;

  /** Número total de templates */
  count?: number;

  /** Mensagem de erro (quando houver falha) */
  error?: string;

  /** Código de erro (quando houver falha) */
  errorCode?: string;

  /** Status HTTP (opcional) */
  status?: number;
}
