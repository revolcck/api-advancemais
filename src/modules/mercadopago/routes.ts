/**
 * Rotas para o módulo core do MercadoPago
 * @module modules/mercadopago/routes
 */

import { Router } from "express";
import { WebhookController, StatusController } from "./controllers";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";

// Cria o router
const router: Router = Router();

// Controladores
const webhookController = new WebhookController();
const statusController = new StatusController();

/**
 * @route GET /api/mercadopago/status
 * @desc Verifica status de conectividade com o MercadoPago
 * @access Privado (requer permissão de administração financeira)
 */
router.get(
  "/status",
  authenticate,
  authorize(["ADMIN", "Super Administrador", "Financeiro"]),
  statusController.checkStatus
);

/**
 * @route GET /api/mercadopago/public-key
 * @desc Obtém a chave pública do MercadoPago para uso no frontend
 * @access Público
 */
router.get("/public-key", statusController.getPublicKey);

/**
 * @route GET /api/mercadopago/config
 * @desc Obtém informações de configuração do MercadoPago (sem expor tokens)
 * @access Privado (requer permissão de administração do sistema)
 */
router.get(
  "/config",
  authenticate,
  authorize(["ADMIN", "Super Administrador"]),
  statusController.getConfig
);

/**
 * @route POST /api/mercadopago/webhooks
 * @desc Endpoint para receber webhooks do MercadoPago
 * @access Público (necessário para integrações)
 */
router.post("/webhooks", webhookController.handleWebhook);

/**
 * @route POST /api/mercadopago/webhooks/checkout
 * @desc Endpoint específico para webhooks do Checkout Pro
 * @access Público (necessário para integrações)
 */
router.post("/webhooks/checkout", webhookController.handleCheckoutWebhook);

/**
 * @route POST /api/mercadopago/webhooks/subscription
 * @desc Endpoint específico para webhooks de Assinaturas
 * @access Público (necessário para integrações)
 */
router.post(
  "/webhooks/subscription",
  webhookController.handleSubscriptionWebhook
);

/**
 * @route GET /api/mercadopago/webhooks/history
 * @desc Consulta o histórico de webhooks recebidos
 * @access Privado (requer permissão de administração financeira)
 */
router.get(
  "/webhooks/history",
  authenticate,
  authorize(["ADMIN", "Super Administrador", "Financeiro"]),
  webhookController.getWebhookHistory
);

export default router;
