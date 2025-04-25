/**
 * Rotas para o módulo de autenticação
 * @module modules/auth/routes
 *
 * Este arquivo centraliza todas as rotas relacionadas à autenticação
 * e gerenciamento de usuários e aplica middlewares comuns.
 */
import { Router, Request, Response, NextFunction } from "express";
import { logger } from "@/shared/utils/logger.utils";
import { validate } from "@/shared/middleware/validate.middleware";
import { authenticate } from "@/shared/middleware/auth.middleware";
import { AuthController } from "../controllers/auth.controller";
import {
  loginSchema,
  registerPessoaFisicaSchema,
  registerPessoaJuridicaSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from "../validators/auth.validators";

// Importação de constantes
import { AUTH_ROUTES } from "../constants/routes.constants";

// Inicializa o router principal
const router: Router = Router();

// Inicializa o controlador
const authController = new AuthController();

/**
 * Middleware para logging de todas as requisições do módulo de autenticação
 */
const logAuthRequest = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  logger.debug(`Requisição Auth: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    userId: req.user?.id || "anonymous",
  });
  next();
};

// Aplica middleware de logging a todas as rotas
router.use(logAuthRequest);

/**
 * @route POST /api/auth/login
 * @desc Autenticar usuário e retornar tokens
 * @access Público
 */
router.post(AUTH_ROUTES.LOGIN, validate(loginSchema), authController.login);

/**
 * @route POST /api/auth/register/pessoa-fisica
 * @desc Registrar novo usuário pessoa física
 * @access Público
 */
router.post(
  AUTH_ROUTES.REGISTER_PF,
  validate(registerPessoaFisicaSchema),
  authController.registerPessoaFisica
);

/**
 * @route POST /api/auth/register/pessoa-juridica
 * @desc Registrar novo usuário pessoa jurídica
 * @access Público
 */
router.post(
  AUTH_ROUTES.REGISTER_PJ,
  validate(registerPessoaJuridicaSchema),
  authController.registerPessoaJuridica
);

/**
 * @route POST /api/auth/refresh
 * @desc Atualizar token de acesso usando token de refresh
 * @access Público
 */
router.post(
  AUTH_ROUTES.REFRESH,
  validate(refreshTokenSchema),
  authController.refreshToken
);

/**
 * @route POST /api/auth/logout
 * @desc Realizar logout e invalidar tokens
 * @access Privado
 */
router.post(
  AUTH_ROUTES.LOGOUT,
  authenticate,
  validate(refreshTokenSchema),
  authController.logout
);

/**
 * @route POST /api/auth/change-password
 * @desc Alterar senha do usuário
 * @access Privado
 */
router.post(
  AUTH_ROUTES.CHANGE_PASSWORD,
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

/**
 * @route GET /api/auth/status
 * @desc Verificar se o usuário está autenticado
 * @access Privado
 */
router.get(AUTH_ROUTES.STATUS, authenticate, (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Autenticação válida",
    data: {
      user: {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
      },
    },
  });
});

export default router;
