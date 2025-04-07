/**
 * Utilitário para tratamento de erros do MercadoPago
 * @module modules/mercadopago/utils/error-handler.util
 */

import { logger } from "@/shared/utils/logger.utils";

/**
 * Formata um erro do MercadoPago para log e retorno
 * @param error Erro original
 * @param operation Nome da operação que falhou
 * @returns Objeto formatado com detalhes do erro
 */
export function formatMercadoPagoError(
  error: any,
  operation: string
): { message: string; code: string; details: any } {
  let message = `Erro na operação ${operation} do MercadoPago`;
  let code = "MERCADOPAGO_ERROR";
  let details = null;

  // Tenta extrair detalhes do erro
  if (error && error.cause && Array.isArray(error.cause)) {
    // Formato específico de erro da API do MercadoPago
    const causes = error.cause
      .map((c: any) => c.description || c.message || JSON.stringify(c))
      .join(", ");

    message = `${message}: ${causes}`;
    code = `MERCADOPAGO_${operation.toUpperCase()}_ERROR`;
    details = error.cause;
  } else if (error && error.response && error.response.data) {
    // Erro HTTP com resposta estruturada
    const errorData = error.response.data;
    message = `${message}: ${errorData.message || JSON.stringify(errorData)}`;
    code = errorData.code || `MERCADOPAGO_${operation.toUpperCase()}_ERROR`;
    details = errorData;
  } else if (error instanceof Error) {
    // Erro padrão JavaScript
    message = `${message}: ${error.message}`;
    details = { stack: error.stack };
  }

  logger.error(`${message}`, { details });

  return {
    message,
    code,
    details,
  };
}

/**
 * Retorna uma resposta de erro padronizada para APIs
 * @param error Erro original
 * @param operation Nome da operação que falhou
 * @returns Objeto com formato de resposta padronizado
 */
export function formatApiErrorResponse(error: any, operation: string): any {
  const { message, code, details } = formatMercadoPagoError(error, operation);

  return {
    success: false,
    error: message,
    errorCode: code,
    details: process.env.NODE_ENV === "development" ? details : undefined,
  };
}

/**
 * Verifica se o erro é um erro de não encontrado (404)
 * @param error Erro a ser verificado
 * @returns true se for um erro 404
 */
export function isNotFoundError(error: any): boolean {
  return (
    (error.response && error.response.status === 404) ||
    error.status === 404 ||
    error.statusCode === 404 ||
    (error.cause && error.cause.some((c: any) => c.code === "not_found"))
  );
}

/**
 * Verifica se o erro é um erro de autenticação (401)
 * @param error Erro a ser verificado
 * @returns true se for um erro 401
 */
export function isAuthenticationError(error: any): boolean {
  return (
    (error.response && error.response.status === 401) ||
    error.status === 401 ||
    error.statusCode === 401 ||
    (error.cause && error.cause.some((c: any) => c.code === "unauthorized"))
  );
}

/**
 * Verifica se o erro é um erro de autorização (403)
 * @param error Erro a ser verificado
 * @returns true se for um erro 403
 */
export function isAuthorizationError(error: any): boolean {
  return (
    (error.response && error.response.status === 403) ||
    error.status === 403 ||
    error.statusCode === 403 ||
    (error.cause && error.cause.some((c: any) => c.code === "forbidden"))
  );
}
