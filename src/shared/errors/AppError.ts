/**
 * Classe customizada para erros da aplicação
 * Permite tratar erros de negócio de forma padronizada, com status HTTP e mensagens claras
 */
export class AppError extends Error {
  /**
   * Código de status HTTP associado ao erro
   */
  public readonly statusCode: number;

  /**
   * Construtor da classe de erro
   * @param message Mensagem de erro descritiva
   * @param statusCode Código de status HTTP (default: 400 Bad Request)
   */
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";

    // Necessário para manter a cadeia de protótipos adequada para instâncias da classe
    Object.setPrototypeOf(this, AppError.prototype);

    // Captura a stack trace (compatível com Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Erro específico para quando o usuário não está autenticado
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Não autorizado. Autenticação necessária.") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

/**
 * Erro específico para quando o usuário não tem permissão para acessar o recurso
 */
export class ForbiddenError extends AppError {
  constructor(
    message = "Acesso proibido. Você não tem permissão para acessar este recurso."
  ) {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

/**
 * Erro específico para quando o recurso não é encontrado
 */
export class NotFoundError extends AppError {
  constructor(resource = "Recurso") {
    super(`${resource} não encontrado.`, 404);
    this.name = "NotFoundError";
  }
}

/**
 * Erro específico para quando ocorre um conflito com o estado atual do recurso
 */
export class ConflictError extends AppError {
  constructor(message = "Conflito com o estado atual do recurso.") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

/**
 * Erro específico para quando os dados da requisição são inválidos
 */
export class ValidationError extends AppError {
  /**
   * Erros detalhados de validação
   */
  public readonly errors: Record<string, string[]>;

  constructor(
    message = "Dados de entrada inválidos.",
    errors: Record<string, string[]> = {}
  ) {
    super(message, 422);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

/**
 * Erro específico para quando ocorre uma falha no servidor
 */
export class InternalServerError extends AppError {
  constructor(message = "Erro interno do servidor.") {
    super(message, 500);
    this.name = "InternalServerError";
  }
}
