import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError, ValidationError } from "./AppError";
import { logError } from "@/config/logger";
import { env } from "@/config/environment";
import { ZodError } from "zod";

/**
 * Interface para resposta de erro padronizada
 */
interface ErrorResponse {
  status: string;
  message: string;
  errors?: Record<string, string[]>;
  stack?: string;
}

/**
 * Processa erros do Prisma e converte para AppError apropriado
 * @param error Erro do Prisma
 * @returns AppError correspondente
 */
const handlePrismaError = (
  error: Prisma.PrismaClientKnownRequestError
): AppError => {
  // Erros comuns do Prisma e suas traduções para AppError
  switch (error.code) {
    case "P2002": // Unique constraint violation
      return new AppError(
        `Já existe um registro com este ${error.meta?.target || "valor"}.`,
        409
      );

    case "P2025": // Record not found
      return new AppError("Registro não encontrado.", 404);

    case "P2003": // Foreign key constraint failed
      return new AppError(
        "Operação falhou devido a uma restrição de chave estrangeira.",
        400
      );

    case "P2014": // Required relation violation
      return new AppError("Relacionamento obrigatório não encontrado.", 400);

    default:
      logError("Erro não mapeado do Prisma:", error);
      return new AppError("Erro ao processar operação no banco de dados.", 500);
  }
};

/**
 * Processa erros de validação do Zod
 * @param error Erro do Zod
 * @returns ValidationError formatado
 */
const handleZodError = (error: ZodError): ValidationError => {
  const formattedErrors: Record<string, string[]> = {};

  error.errors.forEach((err) => {
    const path = err.path.join(".");

    if (!formattedErrors[path]) {
      formattedErrors[path] = [];
    }

    formattedErrors[path].push(err.message);
  });

  return new ValidationError("Dados de entrada inválidos.", formattedErrors);
};

/**
 * Classe para tratamento centralizado de erros
 */
export class ErrorHandler {
  /**
   * Middleware para tratamento de erros do Express
   * @param error Erro capturado
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Próximo middleware
   */
  static handle(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    let processedError: AppError;

    // Identifica o tipo de erro e faz o tratamento adequado
    if (error instanceof AppError) {
      // Já é um AppError, mantém como está
      processedError = error;
    } else if (error instanceof ZodError) {
      // Erro de validação do Zod
      processedError = handleZodError(error);
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Erro conhecido do Prisma
      processedError = handlePrismaError(error);
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      // Erro de validação do Prisma (geralmente problema no código)
      logError("Erro de validação do Prisma:", error);
      processedError = new AppError(
        "Erro de validação na operação do banco de dados.",
        500
      );
    } else if (error.name === "SyntaxError") {
      // Erro de sintaxe JSON
      processedError = new AppError(
        "Sintaxe JSON inválida na requisição.",
        400
      );
    } else {
      // Erro não tratado
      logError("Erro não tratado:", error);
      processedError = new AppError(
        "Ocorreu um erro interno no servidor.",
        500
      );
    }

    // Prepara a resposta de erro
    const errorResponse: ErrorResponse = {
      status: "error",
      message: processedError.message,
    };

    // Adiciona erros detalhados de validação, se disponíveis
    if (processedError instanceof ValidationError && processedError.errors) {
      errorResponse.errors = processedError.errors;
    }

    // Adiciona stack trace em ambiente de desenvolvimento
    if (env.isDevelopment) {
      errorResponse.stack = processedError.stack;
    }

    // Envia a resposta de erro
    res.status(processedError.statusCode).json(errorResponse);
  }
}
