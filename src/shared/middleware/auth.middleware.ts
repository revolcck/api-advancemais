import { Request, Response, NextFunction } from "express";
import { JwtUtils } from "@/shared/utils/jwt.utils";
import { UnauthorizedError, ForbiddenError } from "@/shared/errors/AppError";
import { prisma } from "@/config/database";

/**
 * Estende a interface Request do Express para incluir os dados do usuário autenticado
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware para autenticação baseada em JWT
 * Verifica se o token no cabeçalho de autorização é válido
 * @param req Objeto de requisição
 * @param res Objeto de resposta
 * @param next Próximo middleware
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extrai o cabeçalho de autorização
  const authHeader = req.headers.authorization;

  // Verifica se o cabeçalho existe e tem o formato correto
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Token de autenticação não fornecido");
  }

  // Extrai o token do cabeçalho
  const token = authHeader.split(" ")[1];

  // Verifica se o token foi fornecido
  if (!token) {
    throw new UnauthorizedError("Token de autenticação não fornecido");
  }

  // Verifica se o token é válido
  const verifyResult = await JwtUtils.verifyToken(token);

  // Verifica se o token é válido
  if (!verifyResult.valid) {
    if (verifyResult.expired) {
      throw new UnauthorizedError("Token de autenticação expirado");
    }
    throw new UnauthorizedError("Token de autenticação inválido");
  }

  // Extrai o ID do usuário do token
  const userId = verifyResult.payload?.sub;

  if (!userId) {
    throw new UnauthorizedError("Token de autenticação inválido");
  }

  // Busca o usuário no banco de dados para verificar se ainda existe e está ativo
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    throw new UnauthorizedError("Usuário não encontrado");
  }

  // Adiciona os dados do usuário ao objeto Request
  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  // Continua para o próximo middleware
  next();
};

/**
 * Factory para criar middleware que verifica se o usuário tem um dos papéis especificados
 * @param allowedRoles Array de papéis permitidos
 * @returns Middleware para verificação de papel
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Verifica se o middleware authenticate foi executado antes
    if (!req.user) {
      throw new UnauthorizedError("Usuário não autenticado");
    }

    // Verifica se o usuário tem um dos papéis permitidos
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        "Você não tem permissão para acessar este recurso"
      );
    }

    // Continua para o próximo middleware
    next();
  };
};

/**
 * Middleware que verifica se o usuário é o proprietário do recurso
 * @param resourceIdParam Nome do parâmetro de URL que contém o ID do recurso
 * @param getUserIdFromResource Função que obtém o ID do usuário proprietário do recurso
 * @returns Middleware para verificação de propriedade
 */
export const authorizeOwner = (
  resourceIdParam: string,
  getUserIdFromResource: (resourceId: string) => Promise<string | null>
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Verifica se o middleware authenticate foi executado antes
    if (!req.user) {
      throw new UnauthorizedError("Usuário não autenticado");
    }

    // Extrai o ID do recurso da URL
    const resourceId = req.params[resourceIdParam];

    if (!resourceId) {
      throw new ForbiddenError(`Parâmetro ${resourceIdParam} não fornecido`);
    }

    // Obtém o ID do usuário proprietário do recurso
    const ownerId = await getUserIdFromResource(resourceId);

    // Verifica se o recurso existe
    if (ownerId === null) {
      throw new ForbiddenError("Recurso não encontrado");
    }

    // Verifica se o usuário é o proprietário do recurso ou um admin
    if (req.user.id !== ownerId && req.user.role !== "ADMIN") {
      throw new ForbiddenError(
        "Você não tem permissão para acessar este recurso"
      );
    }

    // Continua para o próximo middleware
    next();
  };
};
