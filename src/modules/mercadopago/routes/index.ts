/**
 * Rotas para o módulo core do MercadoPago
 * @module modules/mercadopago/routes
 */

import { Router } from "express";
import { WebhookController, StatusController } from "../controllers";
import { authenticate } from "@/shared/middleware/auth.middleware";

// Cria o router
const router: Router = Router();

// Controladores
const webhookController = new WebhookController();
const statusController = new StatusController();

/**
 * @route GET /api/mercadopago/status
 * @desc Verifica status de conectividade com o MercadoPago
 * @access Privado (requer autenticação)
 */
router.get("/status", statusController.checkStatus);

/**
 * @route GET /api/mercadopago/public-key
 * @desc Obtém a chave pública do MercadoPago para uso no frontend
 * @access Público
 */
router.get("/public-key", statusController.getPublicKey);

/**
 * @route POST /api/mercadopago/webhooks
 * @desc Endpoint para receber webhooks do MercadoPago
 * @access Público
 */
router.post("/webhooks", webhookController.handleWebhook);

/**
 * @route POST /api/mercadopago/webhooks/checkout
 * @desc Endpoint específico para webhooks do Checkout Pro
 * @access Público
 */
router.post("/webhooks/checkout", webhookController.handleCheckoutWebhook);

/**
 * @route POST /api/mercadopago/webhooks/subscription
 * @desc Endpoint específico para webhooks de Assinaturas
 * @access Público
 */
router.post(
  "/webhooks/subscription",
  webhookController.handleSubscriptionWebhook
);

export default router;
