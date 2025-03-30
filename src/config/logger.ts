import morgan from "morgan";
import { Request, Response, NextFunction } from "express";
import { env } from "./environment";
import { logger } from "@/shared/utils/logger.utils";

/**
 * Configuração personalizada do Morgan para logging de requisições HTTP
 */
export const morganMiddleware = () => {
  const format =
    ":method :url :status :res[content-length] - :response-time ms";

  const stream = {
    write: (message: string) => {
      const trimmedMessage = message.trim();

      if (env.isDevelopment) {
        logger.debug(`HTTP: ${trimmedMessage}`);
      }
    },
  };

  return morgan(format, { stream });
};

/**
 * Middleware para logging de erros
 * Delega para nosso logger mais robusto
 */
export const errorLogger = (err: Error, req: Request, next: NextFunction) => {
  logger.error(`${req.method} ${req.url} - Erro processando requisição`, err);

  next(err);
};

export const {
  info: logInfo,
  error: logError,
  warn: logWarn,
  debug: logDebug,
} = logger;
