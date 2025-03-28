// src/modules/mercadopago/validators/mercadopago.validators.ts

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
 * Esquema para criação de pagamento
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
 * Esquema para captura de pagamento
 */
export const capturePaymentSchema = Joi.object({
  amount: Joi.number().positive().allow(null).messages({
    "number.base": "Valor da captura deve ser um número",
    "number.positive": "Valor da captura deve ser positivo",
  }),
});

/**
 * Esquema para configuração de recorrência
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
  startDate: Joi.date().iso().min("now").allow(null, "").messages({
    "date.base": "Data de início deve ser uma data válida",
    "date.format": "Data de início deve estar no formato ISO",
    "date.min": "Data de início deve ser futura",
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
 * Esquema para criação de assinatura
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
 * Esquema para atualização do status da assinatura
 */
export const updateSubscriptionStatusSchema = Joi.object({
  status: Joi.string().valid("paused", "authorized").required().messages({
    "string.base": "Status deve ser uma string",
    "any.only": "Status deve ser 'paused' ou 'authorized'",
    "any.required": "Status é obrigatório",
  }),
});

/**
 * Esquema para atualização do valor da assinatura
 */
export const updateSubscriptionAmountSchema = Joi.object({
  amount: Joi.number().positive().required().messages({
    "number.base": "Valor da assinatura deve ser um número",
    "number.positive": "Valor da assinatura deve ser positivo",
    "any.required": "Valor da assinatura é obrigatório",
  }),
});

/**
 * Esquema para validação de webhook
 */
export const webhookSchema = Joi.object({
  type: Joi.string().required().messages({
    "string.empty": "Tipo da notificação é obrigatório",
    "any.required": "Tipo da notificação é obrigatório",
  }),
  date_created: Joi.string().required().messages({
    "string.empty": "Data da notificação é obrigatória",
    "any.required": "Data da notificação é obrigatória",
  }),
  id: Joi.string().allow(null, ""),
  data: Joi.object({
    id: Joi.string().required(),
  })
    .allow(null)
    .messages({
      "object.base": "Dados da notificação devem ser um objeto",
    }),
});
