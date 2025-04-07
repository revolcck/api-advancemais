/**
 * Validadores para as operações do MercadoPago
 * @module modules/mercadopago/validators/mercadopago.validators
 */

import Joi from "joi";

/**
 * Schema para validação de webhooks recebidos do MercadoPago
 */
export const webhookSchema = Joi.object({
  // Tipo da notificação (payment, subscription, etc.)
  type: Joi.string().required(),

  // Data da criação da notificação
  date_created: Joi.alternatives()
    .try(Joi.string().isoDate(), Joi.number())
    .required(),

  // ID da notificação (pode não estar presente em todos os webhooks)
  id: Joi.string().allow(null, ""),

  // Dados da notificação
  data: Joi.object({
    // ID do recurso afetado
    id: Joi.string().required(),
  })
    .unknown(true)
    .required(),

  // Permite campos adicionais, pois o MercadoPago pode enviar informações extras
}).unknown(true);

/**
 * Schema para validação de criação de pagamento
 */
export const createPaymentSchema = Joi.object({
  // Valor da transação
  transaction_amount: Joi.number().positive().required(),

  // Descrição do pagamento
  description: Joi.string().required(),

  // ID do método de pagamento
  payment_method_id: Joi.string().required(),

  // Informações do pagador
  payer: Joi.object({
    email: Joi.string().email().required(),
    first_name: Joi.string(),
    last_name: Joi.string(),
    identification: Joi.object({
      type: Joi.string(),
      number: Joi.string(),
    }),
    type: Joi.string(),
  }).required(),

  // Número de parcelas (opcional, default: 1)
  installments: Joi.number().integer().min(1).default(1),

  // Token do cartão (para pagamentos com cartão)
  token: Joi.string(),

  // ID do emissor (opcional)
  issuer_id: Joi.string(),

  // Referência externa (opcional)
  external_reference: Joi.string(),

  // Metadados (opcional)
  metadata: Joi.object().unknown(true),
}).unknown(true);

/**
 * Schema para validação de criação de preferência
 */
export const createPreferenceSchema = Joi.object({
  // Itens da preferência
  items: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
        title: Joi.string().required(),
        description: Joi.string(),
        picture_url: Joi.string().uri(),
        category_id: Joi.string(),
        quantity: Joi.number().integer().min(1).required(),
        unit_price: Joi.number().positive().required(),
        currency_id: Joi.string(),
      })
    )
    .min(1)
    .required(),

  // Informações do pagador
  payer: Joi.object({
    name: Joi.string(),
    surname: Joi.string(),
    email: Joi.string().email().required(),
    phone: Joi.object({
      area_code: Joi.string(),
      number: Joi.string(),
    }),
    identification: Joi.object({
      type: Joi.string(),
      number: Joi.string(),
    }),
    address: Joi.object({
      zip_code: Joi.string(),
      street_name: Joi.string(),
      street_number: Joi.string(),
    }),
  }),

  // URLs de retorno
  back_urls: Joi.object({
    success: Joi.string().uri(),
    pending: Joi.string().uri(),
    failure: Joi.string().uri(),
  }),

  // Redirecionamento automático
  auto_return: Joi.string().valid("approved", "all"),

  // URL de notificação
  notification_url: Joi.string().uri(),

  // Referência externa
  external_reference: Joi.string(),
}).unknown(true);

/**
 * Schema para validação de criação de assinatura
 */
export const createSubscriptionSchema = Joi.object({
  // ID do plano de pré-aprovação (opcional)
  preapproval_plan_id: Joi.string(),

  // Motivo ou descrição da assinatura
  reason: Joi.string().required(),

  // Referência externa (opcional)
  external_reference: Joi.string(),

  // Email do pagador
  payer_email: Joi.string().email().required(),

  // Configuração de recorrência
  auto_recurring: Joi.object({
    frequency: Joi.number().integer().min(1).required(),
    frequency_type: Joi.string().valid("days", "months").required(),
    transaction_amount: Joi.number().positive().required(),
    currency_id: Joi.string().default("BRL"),
    start_date: Joi.alternatives().try(Joi.string().isoDate(), Joi.number()),
    end_date: Joi.alternatives().try(Joi.string().isoDate(), Joi.number()),
  }).required(),

  // URL de retorno após autorização
  back_url: Joi.string().uri(),

  // Status inicial
  status: Joi.string().valid("pending", "authorized", "paused", "cancelled"),

  // ID do token de cartão
  card_token_id: Joi.string(),
}).unknown(true);

/**
 * Schema para validação de reembolso de pagamento
 */
export const refundPaymentSchema = Joi.object({
  // Valor do reembolso (opcional para reembolso total)
  amount: Joi.number().positive(),
}).unknown(true);

/**
 * Schema para validação de atualização de valor de assinatura
 */
export const updateSubscriptionAmountSchema = Joi.object({
  // Novo valor da assinatura
  amount: Joi.number().positive().required(),
}).unknown(true);

/**
 * Schema para validação de atualização de status de assinatura
 */
export const updateSubscriptionStatusSchema = Joi.object({
  // Novo status da assinatura
  status: Joi.string().valid("authorized", "paused", "cancelled").required(),
}).unknown(true);
