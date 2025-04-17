import Joi from "joi";

/**
 * Validadores específicos para operações de assinatura
 */

/**
 * Schema para validação de criação de assinatura
 */
export const createSubscriptionSchema = Joi.object({
  // ID do plano a ser assinado
  planId: Joi.string().uuid().required().messages({
    "string.empty": "ID do plano é obrigatório",
    "any.required": "ID do plano é obrigatório",
    "string.guid": "ID do plano inválido",
  }),

  // ID do método de pagamento
  paymentMethodId: Joi.string().uuid().required().messages({
    "string.empty": "ID do método de pagamento é obrigatório",
    "any.required": "ID do método de pagamento é obrigatório",
    "string.guid": "ID do método de pagamento inválido",
  }),

  // ID do cupom de desconto (opcional)
  couponId: Joi.string().uuid().allow(null, "").messages({
    "string.guid": "ID do cupom inválido",
  }),

  // URL de retorno após o pagamento (opcional)
  backUrl: Joi.string().uri().allow(null, "").messages({
    "string.uri": "URL de retorno inválida",
  }),

  // ID do cartão de crédito salvo (opcional)
  paymentCardId: Joi.string().uuid().allow(null, "").messages({
    "string.guid": "ID do cartão inválido",
  }),

  // Metadados adicionais (opcional)
  metadata: Joi.object().allow(null).default({}),
});

/**
 * Schema para validação de cancelamento de assinatura
 */
export const cancelSubscriptionSchema = Joi.object({
  reason: Joi.string().max(200).allow(null, "").messages({
    "string.max": "Motivo deve ter no máximo {#limit} caracteres",
  }),
});

/**
 * Schema para validação de filtro de assinaturas
 */
export const listSubscriptionsSchema = Joi.object({
  status: Joi.string()
    .valid(
      "ACTIVE",
      "CANCELED",
      "PENDING",
      "PAYMENT_FAILED",
      "PAST_DUE",
      "TRIAL",
      "EXPIRED",
      "ON_HOLD"
    )
    .allow(null, ""),
});
