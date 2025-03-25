import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { ValidationError } from "@/shared/errors/AppError";

/**
 * Enum para definir quais partes da requisição devem ser validadas
 */
export enum ValidateSource {
  BODY = "body",
  QUERY = "query",
  PARAMS = "params",
}

/**
 * Interface para mapear os erros de validação do Joi para o formato da API
 */
interface JoiValidationErrors {
  [key: string]: string[];
}

/**
 * Factory para criar middleware de validação
 * @param schema Schema do Joi para validação
 * @param source Parte da requisição a ser validada (body, query ou params)
 * @returns Middleware para validação dos dados
 */
export const validate = (
  schema: Joi.Schema,
  source: ValidateSource = ValidateSource.BODY
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Obtém os dados a serem validados com base na fonte especificada
    const data = req[source];

    // Executa a validação
    const { error, value } = schema.validate(data, {
      abortEarly: false, // Retorna todos os erros, não apenas o primeiro
      allowUnknown: true, // Permite campos não definidos no schema
      stripUnknown: true, // Remove campos não definidos no schema
    });

    // Se não houver erros, substitui os dados originais pelos validados
    if (!error) {
      req[source] = value;
      return next();
    }

    // Formata os erros para o padrão da API
    const validationErrors: JoiValidationErrors = {};

    error.details.forEach((err) => {
      const key = err.path.join(".");

      if (!validationErrors[key]) {
        validationErrors[key] = [];
      }

      validationErrors[key].push(err.message);
    });

    // Lança um erro de validação com os detalhes formatados
    throw new ValidationError("Dados de entrada inválidos", validationErrors);
  };
};
