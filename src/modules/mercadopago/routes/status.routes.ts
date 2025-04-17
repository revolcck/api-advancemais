/**
 * Rotas para verificação de status e configuração do MercadoPago
 * @module modules/mercadopago/routes/status
 */
import { Router } from "express";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";
import { StatusController } from "../controllers/status.controller";

// Importação de constantes
import { STATUS_ROUTES } from "../constants/routes.constants";
import { PERMISSIONS } from "@/shared/constants/permissions.constants";

// Inicializa o router
const router: Router = Router();
const statusController = new StatusController();

/**
 * @route GET /api/mercadopago/status
 * @desc Verifica status de conectividade com o MercadoPago
 * @access Privado (requer permissão de administração)
 */
router.get(
  STATUS_ROUTES.ROOT,
  authenticate,
  authorize(PERMISSIONS.ADMIN),
  statusController.checkStatus
);

/**
 * @route GET /api/mercadopago/status/public-key
 * @desc Obtém a chave pública do MercadoPago para uso no frontend
 * @access Público
 */
router.get(STATUS_ROUTES.PUBLIC_KEY, statusController.getPublicKey);

/**
 * @route GET /api/mercadopago/status/config
 * @desc Obtém informações de configuração do MercadoPago (sem expor tokens)
 * @access Privado (requer permissão de administração do sistema)
 */
router.get(
  STATUS_ROUTES.CONFIG,
  authenticate,
  authorize(PERMISSIONS.ADMIN),
  statusController.getConfig
);

export default router;
