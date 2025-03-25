import fs from "fs";
import path from "path";
import morgan from "morgan";
import { Request, Response, NextFunction } from "express";
import { env } from "./environment";

/**
 * Garantir que o diretório de logs existe
 */
const logDirectory = path.join(process.cwd(), env.log.dir);
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

/**
 * Configuração de stream para gravação de logs em arquivo
 * Usado pelo Morgan para registrar logs de acesso
 */
export const accessLogStream = fs.createWriteStream(
  path.join(logDirectory, "access.log"),
  { flags: "a" }
);

/**
 * Stream para gravação de logs de erros em arquivo separado
 */
export const errorLogStream = fs.createWriteStream(
  path.join(logDirectory, "error.log"),
  { flags: "a" }
);

/**
 * Middleware do Morgan configurado para o formato especificado no .env
 * Em desenvolvimento, saída colorida no console
 * Em produção, logs gravados em arquivo
 */
export const morganMiddleware = () => {
  if (env.isDevelopment) {
    // Em desenvolvimento, exibe logs coloridos no console
    return morgan("dev");
  } else {
    // Em produção, grava logs no formato configurado em arquivo
    return morgan(env.log.format, { stream: accessLogStream });
  }
};

/**
 * Middleware personalizado para logging de erros
 * Registra erros detalhados no arquivo de log de erros
 */
export const errorLogger = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [ERROR] ${req.method} ${req.url} - ${
    err.stack || err.message
  }\n`;

  // Escreve no arquivo de log de erros
  errorLogStream.write(logEntry);

  // Continua para o próximo middleware
  next(err);
};

/**
 * Função para logging de informações gerais
 * @param message Mensagem a ser registrada
 * @param data Dados adicionais opcionais
 */
export const logInfo = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = data
    ? `[${timestamp}] [INFO] ${message} ${JSON.stringify(data)}`
    : `[${timestamp}] [INFO] ${message}`;

  console.log(logMessage);

  if (!env.isDevelopment) {
    const logEntry = `${logMessage}\n`;
    fs.appendFileSync(path.join(logDirectory, "app.log"), logEntry);
  }
};

/**
 * Função para logging de erros gerais
 * @param message Mensagem de erro
 * @param error Objeto de erro ou dados adicionais
 */
export const logError = (message: string, error?: any) => {
  const timestamp = new Date().toISOString();
  const errorStack =
    error instanceof Error ? error.stack : JSON.stringify(error);
  const logMessage = `[${timestamp}] [ERROR] ${message} ${errorStack || ""}`;

  console.error(logMessage);

  if (!env.isDevelopment) {
    const logEntry = `${logMessage}\n`;
    fs.appendFileSync(path.join(logDirectory, "error.log"), logEntry);
  }
};

/**
 * Função para logging de avisos
 * @param message Mensagem de aviso
 * @param data Dados adicionais opcionais
 */
export const logWarn = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = data
    ? `[${timestamp}] [WARN] ${message} ${JSON.stringify(data)}`
    : `[${timestamp}] [WARN] ${message}`;

  console.warn(logMessage);

  if (!env.isDevelopment) {
    const logEntry = `${logMessage}\n`;
    fs.appendFileSync(path.join(logDirectory, "app.log"), logEntry);
  }
};
