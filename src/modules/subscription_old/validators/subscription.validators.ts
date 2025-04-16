/**
 * Validadores para assinaturas
 * @module modules/subscription/validators/subscription.validators
 */

import Joi from "joi";
import { PaymentStatus, SubscriptionStatus } from "@prisma/client";

/**
 * Schema para validação na criação de assinaturas
 */
export const createSubscriptionSchema = Joi.object({
  // Campos obrigatórios
  userId: Joi.string().uuid().required().messages({
    "string.uuid": "ID do usuário deve ser um UUID válido",
    "any.required": "ID do usuário é obrigatório",
  }),

  planId: Joi.string().uuid().required().messages({
    "string.uuid": "ID do plano deve ser um UUID válido",
    "any.required": "ID do plano é obrigatório",
  }),

  paymentMethodId: Joi.string().uuid().required().messages({
    "string.uuid": "ID do método de pagamento deve ser um UUID válido",
    "any.required": "ID do método de pagamento é obrigatório",
  }),

  // Campos opcionais
  paymentCardId: Joi.string().uuid().messages({
    "string.uuid": "ID do cartão deve ser um UUID válido",
  }),

  couponId: Joi.string().uuid().messages({
    "string.uuid": "ID do cupom deve ser um UUID válido",
  }),

  mpSubscriptionId: Joi.string().allow("", null),
  mpPreapprovalId: Joi.string().allow("", null),

  startDate: Joi.date()
    .iso()
    .default(() => new Date()),

  metadataJson: Joi.object().allow(null),
});

/**
 * Schema para validação na atualização de assinaturas
 */
export const updateSubscriptionSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(SubscriptionStatus))
    .messages({
      "any.only": "Status deve ser um valor válido",
    }),

  paymentMethodId: Joi.string().uuid().messages({
    "string.uuid": "ID do método de pagamento deve ser um UUID válido",
  }),

  paymentCardId: Joi.string().uuid().allow(null).messages({
    "string.uuid": "ID do cartão deve ser um UUID válido",
  }),

  nextBillingDate: Joi.date().iso(),

  canceledAt: Joi.date().iso().allow(null),
  cancelReason: Joi.string().max(500).allow("", null).messages({
    "string.max": "Motivo do cancelamento não pode exceder 500 caracteres",
  }),

  isPaused: Joi.boolean(),
  pausedAt: Joi.date().iso().allow(null),

  mpSubscriptionId: Joi.string().allow("", null),
  mpPreapprovalId: Joi.string().allow("", null),
  mpMerchantOrderId: Joi.string().allow("", null),

  metadataJson: Joi.object().allow(null),
}).min(1); // Pelo menos um campo deve ser fornecido

/**
 * Schema para validação de pagamento de assinatura
 */
export const subscriptionPaymentSchema = Joi.object({
  subscriptionId: Joi.string().uuid().required().messages({
    "string.uuid": "ID da assinatura deve ser um UUID válido",
    "any.required": "ID da assinatura é obrigatório",
  }),

  amount: Joi.number().positive().precision(2).required().messages({
    "number.base": "Valor deve ser um número",
    "number.positive": "Valor deve ser positivo",
    "number.precision": "Valor deve ter no máximo duas casas decimais",
    "any.required": "Valor é obrigatório",
  }),

  currency: Joi.string().default("BRL"),

  status: Joi.string()
    .valid(...Object.values(PaymentStatus))
    .required()
    .messages({
      "any.only": "Status deve ser um valor válido",
      "any.required": "Status é obrigatório",
    }),

  description: Joi.string().max(255).messages({
    "string.max": "Descrição não pode exceder 255 caracteres",
  }),

  paymentDate: Joi.date()
    .iso()
    .default(() => new Date()),

  // Campos MercadoPago
  mpPaymentId: Joi.string().allow("", null),
  mpExternalReference: Joi.string().allow("", null),
  mpPreferenceId: Joi.string().allow("", null),
  mpMerchantOrderId: Joi.string().allow("", null),
  mpPaymentMethodId: Joi.string().allow("", null),
  mpPaymentTypeId: Joi.string().allow("", null),
  mpStatus: Joi.string().allow("", null),
  mpStatusDetail: Joi.string().allow("", null),

  // Outros campos
  gatewayResponse: Joi.object().allow(null),
  discountAmount: Joi.number().min(0).precision(2),
  originalAmount: Joi.number().positive().precision(2),
  couponCode: Joi.string().allow("", null),
});

/**
 * Schema para validação de inicialização de assinatura via MercadoPago
 */
export const initSubscriptionSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    "string.uuid": "ID do usuário deve ser um UUID válido",
    "any.required": "ID do usuário é obrigatório",
  }),

  email: Joi.string().email().required().messages({
    "string.email": "Email deve ser válido",
    "any.required": "Email é obrigatório",
  }),

  planId: Joi.string().uuid().required().messages({
    "string.uuid": "ID do plano deve ser um UUID válido",
    "any.required": "ID do plano é obrigatório",
  }),

  paymentMethodId: Joi.string().uuid().required().messages({
    "string.uuid": "ID do método de pagamento deve ser um UUID válido",
    "any.required": "ID do método de pagamento é obrigatório",
  }),

  paymentCardId: Joi.string().uuid().messages({
    "string.uuid": "ID do cartão deve ser um UUID válido",
  }),

  couponId: Joi.string().uuid().messages({
    "string.uuid": "ID do cupom deve ser um UUID válido",
  }),

  backUrl: Joi.string().uri().messages({
    "string.uri": "URL de retorno deve ser válida",
  }),

  metadataJson: Joi.object().allow(null),
});
