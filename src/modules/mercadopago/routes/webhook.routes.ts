/**
 * Rotas para webhooks de notificação do MercadoPago
 * @module modules/mercadopago/routes/webhook
 *
 * Estas rotas não usam autenticação para receber callbacks do MercadoPago,
 * mas utilizam validação de assinatura para garantir a autenticidade.
 */
import { Router } from "express";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";
import { WebhookController } from "../webhooks/controllers/webhook.controller";

// Importação de constantes
import { WEBHOOK_ROUTES } from "../constants/routes.constants";
import { PERMISSIONS } from "@/shared/constants/permissions.constants";

// Inicializa o router
const router: Router = Router();
const webhookController = new WebhookController();

/**
 * @route POST /api/mercadopago/webhooks
 * @desc Endpoint principal para receber notificações do MercadoPago
 * @access Público (necessário para integrações)
 */
router.post(WEBHOOK_ROUTES.ROOT, webhookController.handleWebhook);

/**
 * @route POST /api/mercadopago/webhooks/checkout
 * @desc Endpoint específico para webhooks do Checkout Pro
 * @access Público (necessário para integrações)
 */
router.post(WEBHOOK_ROUTES.CHECKOUT, webhookController.handleWebhook);

/**
 * @route POST /api/mercadopago/webhooks/subscription
 * @desc Endpoint específico para webhooks de Assinaturas
 * @access Público (necessário para integrações)
 */
router.post(WEBHOOK_ROUTES.SUBSCRIPTION, webhookController.handleWebhook);

/**
 * @route GET /api/mercadopago/webhooks/history
 * @desc Consulta o histórico de webhooks recebidos
 * @access Privado (requer permissão de administração financeira)
 */
router.get(
  WEBHOOK_ROUTES.HISTORY,
  authenticate,
  authorize(PERMISSIONS.FINANCIAL),
  webhookController.getWebhookHistory
);

/**
 * @route GET /api/mercadopago/webhooks/test
 * @desc Endpoint para teste de webhook (apenas ambiente de desenvolvimento)
 * @access Privado (apenas administradores)
 */
router.get(
  WEBHOOK_ROUTES.TEST,
  authenticate,
  authorize(PERMISSIONS.ADMIN),
  webhookController.testWebhook
);

export default router;
