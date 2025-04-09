/**
 * Validadores para webhooks de assinatura
 * @module modules/subscription/validators/webhook.validators
 */

import Joi from "joi";
import { WebhookEventType } from "@/modules/mercadopago/types/events.types";

/**
 * Schema para validação de webhook do MercadoPago
 */
export const processWebhookSchema = Joi.object({
  type: Joi.string().required().messages({
    "any.required": "Tipo do evento é obrigatório",
  }),

  action: Joi.string(),

  id: Joi.string().required().messages({
    "any.required": "ID do evento é obrigatório",
  }),

  date_created: Joi.alternatives()
    .try(Joi.date().iso(), Joi.string().isoDate(), Joi.number().positive())
    .required()
    .messages({
      "any.required": "Data de criação é obrigatória",
    }),

  data: Joi.object({
    id: Joi.string().required().messages({
      "any.required": "ID do recurso é obrigatório",
    }),
  })
    .unknown(true)
    .required()
    .messages({
      "any.required": "Dados do evento são obrigatórios",
    }),

  live_mode: Joi.boolean(),
}).unknown(true);

/**
 * Schema para validação de verificação de webhook
 */
export const verifyWebhookSchema = Joi.object({
  signature: Joi.string().required().messages({
    "any.required": "Assinatura é obrigatória",
  }),

  payload: Joi.string().required().messages({
    "any.required": "Payload é obrigatório",
  }),

  type: Joi.string()
    .valid(...Object.values(WebhookEventType))
    .messages({
      "any.only": "Tipo deve ser um valor válido",
    }),
});

/**
 * Schema para validação de evento de assinatura
 */
export const subscriptionEventSchema = Joi.object({
  id: Joi.string().required().messages({
    "any.required": "ID da assinatura é obrigatório",
  }),

  action: Joi.string().required().messages({
    "any.required": "Ação é obrigatória",
  }),

  status: Joi.string(),
  external_reference: Joi.string(),
  payer_email: Joi.string().email().messages({
    "string.email": "Email do pagador deve ser válido",
  }),

  reason: Joi.string(),
  preapproval_plan_id: Joi.string(),
  payment_method_id: Joi.string(),

  last_modified: Joi.alternatives().try(
    Joi.date().iso(),
    Joi.string().isoDate(),
    Joi.number().positive()
  ),

  next_payment_date: Joi.alternatives().try(
    Joi.date().iso(),
    Joi.string().isoDate(),
    Joi.number().positive()
  ),
}).unknown(true);

/**
 * Schema para validação de evento de pagamento
 */
export const paymentEventSchema = Joi.object({
  id: Joi.string().required().messages({
    "any.required": "ID do pagamento é obrigatório",
  }),

  action: Joi.string().required().messages({
    "any.required": "Ação é obrigatória",
  }),

  status: Joi.string(),
  status_detail: Joi.string(),
  external_reference: Joi.string(),

  date_created: Joi.alternatives().try(
    Joi.date().iso(),
    Joi.string().isoDate(),
    Joi.number().positive()
  ),

  date_approved: Joi.alternatives().try(
    Joi.date().iso(),
    Joi.string().isoDate(),
    Joi.number().positive()
  ),

  transaction_amount: Joi.number().positive(),
  payment_method_id: Joi.string(),
  payment_type_id: Joi.string(),
}).unknown(true);
