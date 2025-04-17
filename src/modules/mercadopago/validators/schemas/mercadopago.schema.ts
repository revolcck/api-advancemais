import Joi from "joi";

/**
 * Schemas de validação para o módulo MercadoPago
 */

/**
 * Schema para validação de criação de pagamento de curso
 */
export const createCoursePaymentSchema = Joi.object({
  // ID do curso a ser comprado
  courseId: Joi.string().uuid().required().messages({
    "string.empty": "ID do curso é obrigatório",
    "any.required": "ID do curso é obrigatório",
    "string.guid": "ID do curso inválido",
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

  // Número de parcelas (apenas para cartão de crédito)
  installments: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .allow(null)
    .default(1)
    .messages({
      "number.base": "Número de parcelas deve ser um número",
      "number.integer": "Número de parcelas deve ser um número inteiro",
      "number.min": "Número de parcelas deve ser pelo menos 1",
      "number.max": "Número máximo de parcelas é 12",
    }),

  // ID do cartão de crédito salvo (opcional)
  paymentCardId: Joi.string().uuid().allow(null, "").messages({
    "string.guid": "ID do cartão inválido",
  }),
});

/**
 * Schema para validação de webhook do MercadoPago
 */
export const webhookNotificationSchema = Joi.object({
  id: Joi.string().required(),
  action: Joi.string().required(),
  api_version: Joi.string().allow(null, ""),
  date_created: Joi.string(),
  type: Joi.string().allow(null, ""),
  data: Joi.object({
    id: Joi.string().required(),
  }).required(),
  user_id: Joi.string().allow(null, ""),
  live_mode: Joi.boolean().default(true),
}).unknown(true);
