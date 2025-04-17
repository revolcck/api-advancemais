import { Router } from "express";
import { WebhookController } from "../webhooks/controllers/webhook.controller";

/**
 * Rotas para webhooks de notificação do MercadoPago
 * Estas rotas não usam autenticação para receber callbacks do MercadoPago
 */
const router: Router = Router();
const webhookController = new WebhookController();

// Endpoint para receber notificações do MercadoPago
router.post("/", webhookController.handleWebhook);

// Endpoint para teste de webhook (apenas ambiente de desenvolvimento)
router.get("/test", webhookController.testWebhook);

export default router;
