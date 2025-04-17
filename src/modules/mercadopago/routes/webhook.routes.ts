/**
 * Rotas para webhooks de notificação do MercadoPago
 * Estas rotas não usam autenticação para receber callbacks do MercadoPago
 */
import { Router } from "express";
import { WebhookController } from "../webhooks/controllers/webhook.controller";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";

const router: Router = Router();
const webhookController = new WebhookController();

/**
 * @route POST /api/mercadopago/webhooks
 * @desc Endpoint principal para receber notificações do MercadoPago
 * @access Público (necessário para integrações)
 */
router.post("/", webhookController.handleWebhook);

/**
 * @route POST /api/mercadopago/webhooks/checkout
 * @desc Endpoint específico para webhooks do Checkout Pro
 * @access Público (necessário para integrações)
 */
router.post("/checkout", webhookController.handleWebhook);

/**
 * @route POST /api/mercadopago/webhooks/subscription
 * @desc Endpoint específico para webhooks de Assinaturas
 * @access Público (necessário para integrações)
 */
router.post("/subscription", webhookController.handleWebhook);

/**
 * @route GET /api/mercadopago/webhooks/history
 * @desc Consulta o histórico de webhooks recebidos
 * @access Privado (requer permissão de administração financeira)
 */
router.get(
  "/history",
  authenticate,
  authorize(["ADMIN", "Super Administrador", "Financeiro"]),
  webhookController.getWebhookHistory
);

/**
 * @route GET /api/mercadopago/webhooks/test
 * @desc Endpoint para teste de webhook (apenas ambiente de desenvolvimento)
 * @access Privado (apenas administradores)
 */
router.get(
  "/test",
  authenticate,
  authorize(["ADMIN", "Super Administrador"]),
  webhookController.testWebhook
);

export default router;
