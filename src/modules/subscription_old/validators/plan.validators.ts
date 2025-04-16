/**
 * Validadores para planos de assinatura
 * @module modules/subscription/validators/plan.validators
 */

import Joi from "joi";
import { BillingInterval } from "@prisma/client";

/**
 * Schema para validação de features do plano
 */
const featuresSchema = Joi.object({}).pattern(
  Joi.string(), // Chave (nome da feature)
  Joi.alternatives(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.object(),
    Joi.array()
  ) // Valor (tipo da feature)
);

/**
 * Schema para validação na criação de planos
 */
export const createPlanSchema = Joi.object({
  // Campos obrigatórios
  name: Joi.string().min(3).max(100).required().messages({
    "string.min": "Nome deve ter ao menos 3 caracteres",
    "string.max": "Nome não pode exceder 100 caracteres",
    "any.required": "Nome é obrigatório",
  }),

  price: Joi.number().positive().precision(2).required().messages({
    "number.base": "Preço deve ser um número",
    "number.positive": "Preço deve ser um valor positivo",
    "number.precision": "Preço deve ter no máximo duas casas decimais",
    "any.required": "Preço é obrigatório",
  }),

  interval: Joi.string()
    .valid(...Object.values(BillingInterval))
    .required()
    .messages({
      "any.only": "Intervalo deve ser um valor válido",
      "any.required": "Intervalo é obrigatório",
    }),

  intervalCount: Joi.number().integer().positive().min(1).required().messages({
    "number.base": "Contagem de intervalo deve ser um número",
    "number.integer": "Contagem de intervalo deve ser um número inteiro",
    "number.positive": "Contagem de intervalo deve ser positiva",
    "number.min": "Contagem de intervalo deve ser pelo menos 1",
    "any.required": "Contagem de intervalo é obrigatória",
  }),

  // Campos opcionais
  description: Joi.string().max(1000).messages({
    "string.max": "Descrição não pode exceder 1000 caracteres",
  }),

  features: featuresSchema.required().messages({
    "any.required": "Features são obrigatórias",
  }),

  trialDays: Joi.number().integer().min(0).max(90).messages({
    "number.base": "Dias de teste deve ser um número",
    "number.integer": "Dias de teste deve ser um número inteiro",
    "number.min": "Dias de teste deve ser pelo menos 0",
    "number.max": "Dias de teste não pode exceder 90",
  }),

  isActive: Joi.boolean().default(true),
  isPopular: Joi.boolean().default(false),
  mpProductId: Joi.string().allow("", null),

  // Campos para sistema de vagas
  maxJobOffers: Joi.number().integer().min(0).default(0).messages({
    "number.base": "Número máximo de vagas deve ser um número",
    "number.integer": "Número máximo de vagas deve ser um número inteiro",
    "number.min": "Número máximo de vagas deve ser pelo menos 0",
  }),

  featuredJobOffers: Joi.number().integer().min(0).default(0).messages({
    "number.base": "Número de vagas em destaque deve ser um número",
    "number.integer": "Número de vagas em destaque deve ser um número inteiro",
    "number.min": "Número de vagas em destaque deve ser pelo menos 0",
  }),

  confidentialOffers: Joi.boolean().default(false),
  resumeAccess: Joi.boolean().default(true),
  allowPremiumFilters: Joi.boolean().default(false),
});

/**
 * Schema para validação na atualização de planos
 */
export const updatePlanSchema = Joi.object({
  name: Joi.string().min(3).max(100).messages({
    "string.min": "Nome deve ter ao menos 3 caracteres",
    "string.max": "Nome não pode exceder 100 caracteres",
  }),

  price: Joi.number().positive().precision(2).messages({
    "number.base": "Preço deve ser um número",
    "number.positive": "Preço deve ser um valor positivo",
    "number.precision": "Preço deve ter no máximo duas casas decimais",
  }),

  description: Joi.string().max(1000).allow("", null).messages({
    "string.max": "Descrição não pode exceder 1000 caracteres",
  }),

  features: featuresSchema,

  interval: Joi.string()
    .valid(...Object.values(BillingInterval))
    .messages({
      "any.only": "Intervalo deve ser um valor válido",
    }),

  intervalCount: Joi.number().integer().positive().min(1).messages({
    "number.base": "Contagem de intervalo deve ser um número",
    "number.integer": "Contagem de intervalo deve ser um número inteiro",
    "number.positive": "Contagem de intervalo deve ser positiva",
    "number.min": "Contagem de intervalo deve ser pelo menos 1",
  }),

  trialDays: Joi.number().integer().min(0).max(90).allow(null).messages({
    "number.base": "Dias de teste deve ser um número",
    "number.integer": "Dias de teste deve ser um número inteiro",
    "number.min": "Dias de teste deve ser pelo menos 0",
    "number.max": "Dias de teste não pode exceder 90",
  }),

  isActive: Joi.boolean(),
  isPopular: Joi.boolean(),
  mpProductId: Joi.string().allow("", null),

  // Campos para sistema de vagas
  maxJobOffers: Joi.number().integer().min(0).messages({
    "number.base": "Número máximo de vagas deve ser um número",
    "number.integer": "Número máximo de vagas deve ser um número inteiro",
    "number.min": "Número máximo de vagas deve ser pelo menos 0",
  }),

  featuredJobOffers: Joi.number().integer().min(0).messages({
    "number.base": "Número de vagas em destaque deve ser um número",
    "number.integer": "Número de vagas em destaque deve ser um número inteiro",
    "number.min": "Número de vagas em destaque deve ser pelo menos 0",
  }),

  confidentialOffers: Joi.boolean(),
  resumeAccess: Joi.boolean(),
  allowPremiumFilters: Joi.boolean(),
}).min(1); // Pelo menos um campo deve ser fornecido
