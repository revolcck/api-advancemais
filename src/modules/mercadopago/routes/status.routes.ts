/**
 * Rotas para verificação de status e configuração do MercadoPago
 */
import { Router } from "express";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";
import { StatusController } from "../controllers/status.controller";

// Constantes de roles do sistema
const ADMIN_ROLES = ["Super Administrador", "Administrador"];
const FINANCE_ROLES = [...ADMIN_ROLES, "Setor Pedagógico", "RH"];

const router: Router = Router();
const statusController = new StatusController();

/**
 * @route GET /api/mercadopago/status
 * @desc Verifica status de conectividade com o MercadoPago
 * @access Privado (requer permissão de administração)
 */
router.get(
  "/",
  authenticate,
  authorize(ADMIN_ROLES),
  statusController.checkStatus
);

/**
 * @route GET /api/mercadopago/status/public-key
 * @desc Obtém a chave pública do MercadoPago para uso no frontend
 * @access Público
 */
router.get("/public-key", statusController.getPublicKey);

/**
 * @route GET /api/mercadopago/status/config
 * @desc Obtém informações de configuração do MercadoPago (sem expor tokens)
 * @access Privado (requer permissão de administração do sistema)
 */
router.get(
  "/config",
  authenticate,
  authorize(ADMIN_ROLES),
  statusController.getConfig
);

export default router;
