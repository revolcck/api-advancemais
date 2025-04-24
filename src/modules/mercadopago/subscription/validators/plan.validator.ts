import Joi from "joi";
import { BillingInterval } from "../../types/prisma-enums";

/**
 * Schema para validação de criação de plano de assinatura
 */
export const createPlanSchema = Joi.object({
  // Informações básicas do plano
  name: Joi.string().required().max(100).messages({
    "string.empty": "Nome do plano é obrigatório",
    "any.required": "Nome do plano é obrigatório",
    "string.max": "Nome do plano deve ter no máximo {#limit} caracteres",
  }),

  price: Joi.number().required().min(0).messages({
    "number.base": "Preço deve ser um número",
    "any.required": "Preço é obrigatório",
    "number.min": "Preço não pode ser negativo",
  }),

  description: Joi.string().allow(null, "").max(500).messages({
    "string.max": "Descrição deve ter no máximo {#limit} caracteres",
  }),

  features: Joi.object().required().messages({
    "object.base": "Características do plano devem ser um objeto",
    "any.required": "Características do plano são obrigatórias",
  }),

  // Detalhes de cobrança
  interval: Joi.string()
    .valid(...Object.values(BillingInterval))
    .default(BillingInterval.MONTHLY)
    .messages({
      "any.only": "Intervalo de cobrança inválido",
    }),

  intervalCount: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Contagem de intervalo deve ser um número",
    "number.integer": "Contagem de intervalo deve ser um número inteiro",
    "number.min": "Contagem de intervalo deve ser pelo menos 1",
  }),

  trialDays: Joi.number().integer().min(0).allow(null).messages({
    "number.base": "Dias de teste deve ser um número",
    "number.integer": "Dias de teste deve ser um número inteiro",
    "number.min": "Dias de teste não pode ser negativo",
  }),

  // Status e destaque
  isActive: Joi.boolean().default(true),
  isPopular: Joi.boolean().default(false),

  // ID do produto no MercadoPago
  mpProductId: Joi.string().allow(null, ""),

  // Campos para sistema de vagas
  maxJobOffers: Joi.number().integer().min(0).allow(null).default(0).messages({
    "number.base": "Máximo de ofertas de emprego deve ser um número",
    "number.integer": "Máximo de ofertas de emprego deve ser um número inteiro",
    "number.min": "Máximo de ofertas de emprego não pode ser negativo",
  }),

  featuredJobOffers: Joi.number()
    .integer()
    .min(0)
    .allow(null)
    .default(0)
    .messages({
      "number.base": "Ofertas em destaque deve ser um número",
      "number.integer": "Ofertas em destaque deve ser um número inteiro",
      "number.min": "Ofertas em destaque não pode ser negativo",
    }),

  confidentialOffers: Joi.boolean().default(false),
  resumeAccess: Joi.boolean().default(true),
  allowPremiumFilters: Joi.boolean().default(false),
});

/**
 * Schema para validação de atualização de plano de assinatura
 */
export const updatePlanSchema = Joi.object({
  // Informações básicas do plano
  name: Joi.string().max(100).messages({
    "string.max": "Nome do plano deve ter no máximo {#limit} caracteres",
  }),

  price: Joi.number().min(0).messages({
    "number.base": "Preço deve ser um número",
    "number.min": "Preço não pode ser negativo",
  }),

  description: Joi.string().allow(null, "").max(500).messages({
    "string.max": "Descrição deve ter no máximo {#limit} caracteres",
  }),

  features: Joi.object().messages({
    "object.base": "Características do plano devem ser um objeto",
  }),

  // Detalhes de cobrança
  interval: Joi.string()
    .valid(...Object.values(BillingInterval))
    .messages({
      "any.only": "Intervalo de cobrança inválido",
    }),

  intervalCount: Joi.number().integer().min(1).messages({
    "number.base": "Contagem de intervalo deve ser um número",
    "number.integer": "Contagem de intervalo deve ser um número inteiro",
    "number.min": "Contagem de intervalo deve ser pelo menos 1",
  }),

  trialDays: Joi.number().integer().min(0).allow(null).messages({
    "number.base": "Dias de teste deve ser um número",
    "number.integer": "Dias de teste deve ser um número inteiro",
    "number.min": "Dias de teste não pode ser negativo",
  }),

  // Status e destaque
  isActive: Joi.boolean(),
  isPopular: Joi.boolean(),

  // ID do produto no MercadoPago
  mpProductId: Joi.string().allow(null, ""),

  // Campos para sistema de vagas
  maxJobOffers: Joi.number().integer().min(0).allow(null).messages({
    "number.base": "Máximo de ofertas de emprego deve ser um número",
    "number.integer": "Máximo de ofertas de emprego deve ser um número inteiro",
    "number.min": "Máximo de ofertas de emprego não pode ser negativo",
  }),

  featuredJobOffers: Joi.number().integer().min(0).allow(null).messages({
    "number.base": "Ofertas em destaque deve ser um número",
    "number.integer": "Ofertas em destaque deve ser um número inteiro",
    "number.min": "Ofertas em destaque não pode ser negativo",
  }),

  confidentialOffers: Joi.boolean(),
  resumeAccess: Joi.boolean(),
  allowPremiumFilters: Joi.boolean(),
});
