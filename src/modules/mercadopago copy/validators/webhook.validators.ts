/**
 * Validadores para webhooks do MercadoPago
 * @module modules/mercadopago/validators/webhook.validators
 */

import Joi from "joi";
import { WebhookEventType } from "../types/events.types";

/**
 * Schema para validação de webhooks genéricos recebidos do MercadoPago
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
 * Schema para validação específica de webhooks de pagamento
 */
export const paymentWebhookSchema = Joi.object({
  type: Joi.string().valid(WebhookEventType.PAYMENT).required(),

  action: Joi.string().valid(
    "payment.created",
    "payment.updated",
    "payment.approved",
    "payment.rejected",
    "payment.refunded"
  ),

  data: Joi.object({
    id: Joi.string().required(),
  })
    .unknown(true)
    .required(),

  date_created: Joi.alternatives()
    .try(Joi.string().isoDate(), Joi.number())
    .required(),
}).unknown(true);

/**
 * Schema para validação específica de webhooks de assinatura
 */
export const subscriptionWebhookSchema = Joi.object({
  type: Joi.string().valid(WebhookEventType.SUBSCRIPTION).required(),

  action: Joi.string().valid(
    "subscription.created",
    "subscription.updated",
    "subscription.paused",
    "subscription.cancelled"
  ),

  data: Joi.object({
    id: Joi.string().required(),
  })
    .unknown(true)
    .required(),

  date_created: Joi.alternatives()
    .try(Joi.string().isoDate(), Joi.number())
    .required(),
}).unknown(true);

/**
 * Schema para validação específica de webhooks de fatura de assinatura
 */
export const invoiceWebhookSchema = Joi.object({
  type: Joi.string().valid(WebhookEventType.INVOICE).required(),

  action: Joi.string().valid("invoice.created", "invoice.updated"),

  data: Joi.object({
    id: Joi.string().required(),
  })
    .unknown(true)
    .required(),

  date_created: Joi.alternatives()
    .try(Joi.string().isoDate(), Joi.number())
    .required(),
}).unknown(true);

/**
 * Schema para validação específica de webhooks de ordem do mercador
 */
export const merchantOrderWebhookSchema = Joi.object({
  type: Joi.string().valid(WebhookEventType.MERCHANT_ORDER).required(),

  data: Joi.object({
    id: Joi.string().required(),
  })
    .unknown(true)
    .required(),

  date_created: Joi.alternatives()
    .try(Joi.string().isoDate(), Joi.number())
    .required(),
}).unknown(true);
