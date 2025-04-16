/**
 * Validadores comuns para o módulo MercadoPago
 * @module modules/mercadopago/validators/common.validators
 */

import Joi from "joi";

/**
 * Esquema de validação para documento (CPF/CNPJ)
 */
export const documentSchema = Joi.string()
  .pattern(/^(\d{11}|\d{14})$/)
  .messages({
    "string.pattern.base":
      "Documento deve conter 11 (CPF) ou 14 (CNPJ) dígitos",
    "string.empty": "Documento é obrigatório",
  });

/**
 * Esquema de validação para preço (valor monetário)
 */
export const priceSchema = Joi.number().positive().precision(2).messages({
  "number.base": "Preço deve ser um número",
  "number.positive": "Preço deve ser um valor positivo",
  "number.precision": "Preço deve ter no máximo duas casas decimais",
});

/**
 * Esquema de validação para email
 */
export const emailSchema = Joi.string().email().messages({
  "string.email": "Email deve ser um endereço válido",
  "string.empty": "Email é obrigatório",
});

/**
 * Esquema de validação para telefone
 */
export const phoneSchema = Joi.string()
  .pattern(/^\+?[0-9]{10,15}$/)
  .messages({
    "string.pattern.base":
      "Telefone deve conter entre 10 e 15 dígitos, opcionalmente começando com '+'",
    "string.empty": "Telefone é obrigatório",
  });

/**
 * Esquema de validação para URL externa
 */
export const externalReferenceSchema = Joi.string().max(256).messages({
  "string.max": "Referência externa deve ter no máximo 256 caracteres",
});

/**
 * Esquema de validação para URL de retorno
 */
export const urlSchema = Joi.string().uri().messages({
  "string.uri": "URL deve ser válida",
  "string.empty": "URL é obrigatória",
});

/**
 * Esquema para validação de dados de pagador
 */
export const payerSchema = Joi.object({
  email: emailSchema.required(),
  name: Joi.string(),
  surname: Joi.string(),
  first_name: Joi.string(),
  last_name: Joi.string(),
  identification: Joi.object({
    type: Joi.string().valid("CPF", "CNPJ").required(),
    number: documentSchema.required(),
  }),
  phone: Joi.object({
    area_code: Joi.string().required(),
    number: Joi.string().required(),
  }),
  address: Joi.object({
    zip_code: Joi.string().required(),
    street_name: Joi.string().required(),
    street_number: Joi.string().required(),
    neighborhood: Joi.string(),
    city: Joi.string(),
    federal_unit: Joi.string().length(2),
  }),
});

/**
 * Esquema para validação de item de preferência
 */
export const preferenceItemSchema = Joi.object({
  id: Joi.string().required(),
  title: Joi.string().required(),
  description: Joi.string(),
  picture_url: urlSchema,
  category_id: Joi.string(),
  quantity: Joi.number().integer().min(1).required(),
  unit_price: priceSchema.required(),
  currency_id: Joi.string().default("BRL"),
});
