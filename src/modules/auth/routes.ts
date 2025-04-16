import { Router } from "express";
import { AuthController } from "./controllers/auth.controller";
import { validate } from "@/shared/middleware/validate.middleware";
import {
  loginSchema,
  registerPessoaFisicaSchema,
  registerPessoaJuridicaSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from "./validators/auth.validators";
import { authenticate } from "@/shared/middleware/auth.middleware";

// Inicializa o router
const router: Router = Router();

// Inicializa o controlador
const authController = new AuthController();

/**
 * @route POST /api/auth/login
 * @desc Autenticar usuário e retornar tokens
 * @access Público
 */
router.post("/login", validate(loginSchema), authController.login);

/**
 * @route POST /api/auth/register/pessoa-fisica
 * @desc Registrar novo usuário pessoa física
 * @access Público
 */
router.post(
  "/register/pessoa-fisica",
  validate(registerPessoaFisicaSchema),
  authController.registerPessoaFisica
);

/**
 * @route POST /api/auth/register/pessoa-juridica
 * @desc Registrar novo usuário pessoa jurídica
 * @access Público
 */
router.post(
  "/register/pessoa-juridica",
  validate(registerPessoaJuridicaSchema),
  authController.registerPessoaJuridica
);

/**
 * @route POST /api/auth/refresh
 * @desc Atualizar token de acesso usando token de refresh
 * @access Público
 */
router.post(
  "/refresh",
  validate(refreshTokenSchema),
  authController.refreshToken
);

/**
 * @route POST /api/auth/logout
 * @desc Realizar logout e invalidar tokens
 * @access Privado
 */
router.post(
  "/logout",
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
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
