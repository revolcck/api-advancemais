/**
 * Validadores para o módulo MercadoPago
 * Schemas de validação para as requisições relacionadas ao MercadoPago
 *
 * @module modules/mercadopago/validators/mercadopago.validators
 */

import Joi from "joi";

/**
 * Validador para identificação de pessoa
 */
const identificationSchema = Joi.object({
  type: Joi.string().required().messages({
    "string.empty": "Tipo de documento é obrigatório",
    "any.required": "Tipo de documento é obrigatório",
  }),
  number: Joi.string().required().messages({
    "string.empty": "Número do documento é obrigatório",
    "any.required": "Número do documento é obrigatório",
  }),
});

/**
 * Validador para telefone
 */
const phoneSchema = Joi.object({
  areaCode: Joi.string().required().messages({
    "string.empty": "Código de área é obrigatório",
    "any.required": "Código de área é obrigatório",
  }),
  number: Joi.string().required().messages({
    "string.empty": "Número de telefone é obrigatório",
    "any.required": "Número de telefone é obrigatório",
  }),
});

/**
 * Validador para endereço
 */
const addressSchema = Joi.object({
  zipCode: Joi.string().required().messages({
    "string.empty": "CEP é obrigatório",
    "any.required": "CEP é obrigatório",
  }),
  streetName: Joi.string().required().messages({
    "string.empty": "Nome da rua é obrigatório",
    "any.required": "Nome da rua é obrigatório",
  }),
  streetNumber: Joi.alternatives()
    .try(Joi.string(), Joi.number())
    .required()
    .messages({
      "alternatives.types": "Número da rua deve ser uma string ou número",
      "any.required": "Número da rua é obrigatório",
    }),
  neighborhood: Joi.string().allow(null, ""),
  city: Joi.string().allow(null, ""),
  federalUnit: Joi.string().allow(null, ""),
});

/**
 * Validador para informações do pagador
 */
const payerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Email do pagador deve ser válido",
    "string.empty": "Email do pagador é obrigatório",
    "any.required": "Email do pagador é obrigatório",
  }),
  firstName: Joi.string().allow(null, ""),
  lastName: Joi.string().allow(null, ""),
  identification: identificationSchema.allow(null),
  phone: phoneSchema.allow(null),
  address: addressSchema.allow(null),
});

/**
 * Schema para validação de criação de pagamento
 */
export const createPaymentSchema = Joi.object({
  transactionAmount: Joi.number().positive().required().messages({
    "number.base": "Valor da transação deve ser um número",
    "number.positive": "Valor da transação deve ser positivo",
    "any.required": "Valor da transação é obrigatório",
  }),
  description: Joi.string().required().messages({
    "string.empty": "Descrição é obrigatória",
    "any.required": "Descrição é obrigatória",
  }),
  paymentMethodId: Joi.string().required().messages({
    "string.empty": "Método de pagamento é obrigatório",
    "any.required": "Método de pagamento é obrigatório",
  }),
  payer: payerSchema.required().messages({
    "any.required": "Informações do pagador são obrigatórias",
  }),
  installments: Joi.number().integer().min(1).allow(null),
  token: Joi.string().allow(null, ""),
  externalReference: Joi.string().allow(null, ""),
  callbackUrl: Joi.string().uri().allow(null, "").messages({
    "string.uri": "URL de callback deve ser válida",
  }),
  metadata: Joi.object().allow(null),
});

/**
 * Schema para validação de pesquisa de pagamentos
 */
export const searchPaymentsSchema = Joi.object({
  external_reference: Joi.string(),
  range: Joi.string(),
  begin_date: Joi.string(),
  end_date: Joi.string(),
  status: Joi.string(),
  payment_method_id: Joi.string(),
  payment_type_id: Joi.string(),
  limit: Joi.number().integer().min(1),
  offset: Joi.number().integer().min(0),
  sort: Joi.string(),
  criteria: Joi.string().valid("desc", "asc"),
  email: Joi.string().email(),
  page: Joi.number().integer().min(1),
}).unknown(true);

/**
 * Schema para validação de refund de pagamento
 */
export const refundPaymentSchema = Joi.object({
  amount: Joi.number().positive().allow(null).messages({
    "number.base": "Valor da devolução deve ser um número",
    "number.positive": "Valor da devolução deve ser positivo",
  }),
});

/**
 * Schema para validação de configuração de recorrência
 */
const autoRecurringSchema = Joi.object({
  frequency: Joi.number().integer().min(1).required().messages({
    "number.base": "Frequência deve ser um número",
    "number.integer": "Frequência deve ser um número inteiro",
    "number.min": "Frequência deve ser no mínimo 1",
    "any.required": "Frequência é obrigatória",
  }),
  frequencyType: Joi.string().valid("days", "months").required().messages({
    "string.base": "Tipo de frequência deve ser uma string",
    "any.only": "Tipo de frequência deve ser 'days' ou 'months'",
    "any.required": "Tipo de frequência é obrigatório",
  }),
  startDate: Joi.date().iso().allow(null, "").messages({
    "date.base": "Data de início deve ser uma data válida",
    "date.format": "Data de início deve estar no formato ISO",
  }),
  endDate: Joi.date().iso().min(Joi.ref("startDate")).allow(null, "").messages({
    "date.base": "Data de término deve ser uma data válida",
    "date.format": "Data de término deve estar no formato ISO",
    "date.min": "Data de término deve ser posterior à data de início",
  }),
  repetitions: Joi.number().integer().min(1).allow(null).messages({
    "number.base": "Número de repetições deve ser um número",
    "number.integer": "Número de repetições deve ser um número inteiro",
    "number.min": "Número de repetições deve ser no mínimo 1",
  }),
});

/**
 * Schema para validação de criação de assinatura
 */
export const createSubscriptionSchema = Joi.object({
  preapprovalAmount: Joi.number().positive().required().messages({
    "number.base": "Valor da assinatura deve ser um número",
    "number.positive": "Valor da assinatura deve ser positivo",
    "any.required": "Valor da assinatura é obrigatório",
  }),
  preapprovalName: Joi.string().required().messages({
    "string.empty": "Nome da assinatura é obrigatório",
    "any.required": "Nome da assinatura é obrigatório",
  }),
  autoRecurring: autoRecurringSchema.required().messages({
    "any.required": "Configuração de recorrência é obrigatória",
  }),
  backUrl: Joi.string().uri().required().messages({
    "string.uri": "URL de retorno deve ser válida",
    "string.empty": "URL de retorno é obrigatória",
    "any.required": "URL de retorno é obrigatória",
  }),
  externalReference: Joi.string().allow(null, ""),
  payer: payerSchema.required().messages({
    "any.required": "Informações do assinante são obrigatórias",
  }),
  reason: Joi.string().allow(null, ""),
});

/**
 * Schema para validação de atualização do status da assinatura
 */
export const updateSubscriptionStatusSchema = Joi.object({
  status: Joi.string().valid("paused", "authorized").required().messages({
    "string.base": "Status deve ser uma string",
    "any.only": "Status deve ser 'paused' ou 'authorized'",
    "any.required": "Status é obrigatório",
  }),
});

/**
 * Schema para validação de atualização do valor da assinatura
 */
export const updateSubscriptionAmountSchema = Joi.object({
  amount: Joi.number().positive().required().messages({
    "number.base": "Valor da assinatura deve ser um número",
    "number.positive": "Valor da assinatura deve ser positivo",
    "any.required": "Valor da assinatura é obrigatório",
  }),
});

/**
 * Schema para validação de item de preferência
 */
const preferenceItemSchema = Joi.object({
  id: Joi.string().required().messages({
    "string.empty": "ID do item é obrigatório",
    "any.required": "ID do item é obrigatório",
  }),
  title: Joi.string().required().messages({
    "string.empty": "Título do item é obrigatório",
    "any.required": "Título do item é obrigatório",
  }),
  description: Joi.string().allow(null, ""),
  pictureUrl: Joi.string().uri().allow(null, "").messages({
    "string.uri": "URL da imagem deve ser válida",
  }),
  categoryId: Joi.string().allow(null, ""),
  quantity: Joi.number().integer().min(1).required().messages({
    "number.base": "Quantidade deve ser um número",
    "number.integer": "Quantidade deve ser um número inteiro",
    "number.min": "Quantidade deve ser no mínimo 1",
    "any.required": "Quantidade é obrigatória",
  }),
  unitPrice: Joi.number().positive().required().messages({
    "number.base": "Preço unitário deve ser um número",
    "number.positive": "Preço unitário deve ser positivo",
    "any.required": "Preço unitário é obrigatório",
  }),
  currencyId: Joi.string().allow(null, ""),
});

/**
 * Schema para validação de back_urls
 */
const backUrlsSchema = Joi.object({
  success: Joi.string().uri().allow(null, "").messages({
    "string.uri": "URL de sucesso deve ser válida",
  }),
  pending: Joi.string().uri().allow(null, "").messages({
    "string.uri": "URL de pendente deve ser válida",
  }),
  failure: Joi.string().uri().allow(null, "").messages({
    "string.uri": "URL de falha deve ser válida",
  }),
});

/**
 * Schema para validação de criação de preferência
 */
export const createPreferenceSchema = Joi.object({
  items: Joi.array().items(preferenceItemSchema).min(1).required().messages({
    "array.min": "Pelo menos um item é obrigatório",
    "any.required": "Itens são obrigatórios",
  }),
  payer: payerSchema.allow(null),
  backUrls: backUrlsSchema.allow(null),
  autoReturn: Joi.string().valid("approved", "all").allow(null, ""),
  notificationUrl: Joi.string().uri().allow(null, "").messages({
    "string.uri": "URL de notificação deve ser válida",
  }),
  externalReference: Joi.string().allow(null, ""),
  excludedPaymentMethods: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
      })
    )
    .allow(null),
  excludedPaymentTypes: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
      })
    )
    .allow(null),
  expirationDateFrom: Joi.date().iso().allow(null, "").messages({
    "date.base": "Data de expiração inicial deve ser uma data válida",
    "date.format": "Data de expiração inicial deve estar no formato ISO",
  }),
  expirationDateTo: Joi.date()
    .iso()
    .min(Joi.ref("expirationDateFrom"))
    .allow(null, "")
    .messages({
      "date.base": "Data de expiração final deve ser uma data válida",
      "date.format": "Data de expiração final deve estar no formato ISO",
      "date.min": "Data de expiração final deve ser posterior à data inicial",
    }),
});

/**
 * Schema para validação de webhook
 */
export const webhookSchema = Joi.object({
  type: Joi.string().required().messages({
    "string.empty": "Tipo da notificação é obrigatório",
    "any.required": "Tipo da notificação é obrigatório",
  }),
  date_created: Joi.string().allow(null, ""),
  id: Joi.string().allow(null, ""),
  data: Joi.object({
    id: Joi.string().required().messages({
      "string.empty": "ID do recurso é obrigatório",
      "any.required": "ID do recurso é obrigatório",
    }),
  }).allow(null),
}).unknown(true);
