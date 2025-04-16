/**
 * Utilitário para tratamento de erros do MercadoPago
 * @module modules/mercadopago/utils/error-handler.util
 */

import { logger } from "@/shared/utils/logger.utils";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { MercadoPagoIntegrationType } from "../enums";

/**
 * Interface para erro formatado do MercadoPago
 */
export interface FormattedError {
  /** Mensagem de erro */
  message: string;

  /** Código de erro */
  code: string;

  /** Detalhes adicionais do erro */
  details?: any;

  /** Tipo de integração associado ao erro */
  integrationType?: MercadoPagoIntegrationType;
}

/**
 * Classe para tratamento de erros do MercadoPago
 */
export class MercadoPagoErrorHandler {
  /**
   * Formata um erro do MercadoPago para log e retorno
   * @param error Erro original
   * @param operation Nome da operação que falhou
   * @param integrationType Tipo de integração usado
   * @returns Objeto formatado com detalhes do erro
   */
  public static formatError(
    error: any,
    operation: string,
    integrationType?: MercadoPagoIntegrationType
  ): FormattedError {
    let message = `Erro na operação ${operation} do MercadoPago`;
    let code = "MERCADOPAGO_ERROR";
    let details: any = null;

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

    logger.error(`${message}`, { details, integrationType });

    return {
      message,
      code,
      details,
      integrationType,
    };
  }

  /**
   * Converte um erro do MercadoPago para um erro da aplicação (ServiceUnavailableError)
   * @param error Erro original
   * @param operation Nome da operação que falhou
   * @param integrationType Tipo de integração usado
   * @returns ServiceUnavailableError formatado
   */
  public static toServiceError(
    error: any,
    operation: string,
    integrationType?: MercadoPagoIntegrationType
  ): ServiceUnavailableError {
    const formattedError = this.formatError(error, operation, integrationType);

    return new ServiceUnavailableError(
      formattedError.message,
      formattedError.code,
      {
        details: formattedError.details,
        integrationType: formattedError.integrationType,
      }
    );
  }

  /**
   * Verifica se o erro é um erro de recurso não encontrado (404)
   * @param error Erro a ser verificado
   * @returns true se for um erro 404
   */
  public static isNotFoundError(error: any): boolean {
    return (
      (error.response && error.response.status === 404) ||
      error.status === 404 ||
      error.statusCode === 404 ||
      (error.cause &&
        error.cause.some(
          (c: any) => c.code === "not_found" || c.code === "resource_not_found"
        ))
    );
  }

  /**
   * Verifica se o erro é um erro de autenticação (401)
   * @param error Erro a ser verificado
   * @returns true se for um erro 401
   */
  public static isAuthenticationError(error: any): boolean {
    return (
      (error.response && error.response.status === 401) ||
      error.status === 401 ||
      error.statusCode === 401 ||
      (error.cause &&
        error.cause.some(
          (c: any) => c.code === "unauthorized" || c.code === "invalid_token"
        ))
    );
  }

  /**
   * Verifica se o erro é um erro de chave pública/token de acesso inválidos
   * @param error Erro a ser verificado
   * @returns true se for um erro relacionado a credenciais
   */
  public static isCredentialsError(error: any): boolean {
    // Verifica se é um erro de autenticação
    if (this.isAuthenticationError(error)) {
      return true;
    }

    // Verifica mensagens específicas que indicam problemas de credenciais
    const message =
      error.message ||
      (error.response && error.response.data && error.response.data.message) ||
      "";

    return (
      message.includes("invalid access_token") ||
      message.includes("invalid public_key") ||
      message.includes("public_key não é válida") ||
      message.includes("credenciais inválidas")
    );
  }
}
