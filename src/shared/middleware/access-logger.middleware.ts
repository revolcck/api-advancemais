import { Request, Response, NextFunction } from "express";
import { logger } from "@/shared/utils/logger.utils";
import { v4 as uuidv4 } from "uuid";
import { JwtUtils } from "@/shared/utils/jwt.utils";

/**
 * Middleware para registro de acesso às rotas da API
 * Gera um ID único para cada requisição e registra tempo de resposta
 */
export const accessLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Adiciona um ID único para a requisição
  const requestId = uuidv4();
  req.requestId = requestId;

  // Registra o horário de início da requisição
  const startTime = process.hrtime();

  // Extrai o userId do token JWT, se presente
  let tokenUserId: string | null = null;
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token) {
        // Tenta extrair o userId do token sem verificar (já que isso é feito no middleware de autenticação)
        tokenUserId = JwtUtils.extractUserId(token);
      }
    }
  } catch (error) {
    // Ignora erros na extração do token - não é crítico para o log
  }

  // Captura o IP de origem, priorizando o header X-Forwarded-For para suporte a proxies
  const forwardedIps =
    (req.headers["x-forwarded-for"] as string)?.split(", ") || [];
  const clientIp = forwardedIps[0] || req.socket.remoteAddress || "unknown";

  // Intercepta o método end para registrar o log quando a resposta for enviada
  const originalEnd = res.end;

  // @ts-ignore - Sobrescreve o método end
  res.end = function (chunk?: any, encoding?: any): Response {
    // Calcula o tempo de resposta
    const hrTime = process.hrtime(startTime);
    const responseTime = Math.round(hrTime[0] * 1000 + hrTime[1] / 1000000);

    // Obtém o usuário do contexto da requisição ou do token
    // Prioriza req.user.id (definido pelo middleware de autenticação)
    // Se não disponível, tenta usar o ID extraído do token
    const userId =
      req.user?.id ||
      tokenUserId ||
      (req.body?.userId ? req.body.userId : undefined);

    // Registra cabeçalhos relevantes para depuração, excluindo informações sensíveis
    const safeHeaders = { ...req.headers };
    // Remove informações sensíveis
    delete safeHeaders.authorization;
    delete safeHeaders.cookie;

    // Registra o acesso com todos os detalhes disponíveis
    logger.access(
      req.method,
      req.originalUrl || req.url,
      res.statusCode,
      responseTime,
      req.headers["user-agent"] as string,
      clientIp,
      userId
    );

    // Chama o método original
    // @ts-ignore
    return originalEnd.apply(this, arguments);
  };

  next();
};

// Adiciona o tipo requestId ao Request do Express
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}
