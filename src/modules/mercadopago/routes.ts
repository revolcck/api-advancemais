/**
 * Rotas para o módulo MercadoPago
 * @module modules/mercadopago/routes
 */

import { Router } from "express";
import { webhookController } from "./controllers/webhook.controller";
import { paymentController } from "./controllers/payment.controller";
import { subscriptionController } from "./controllers/subscription.controller";
import { preferenceController } from "./controllers/preference.controller";
import { validate } from "@/shared/middleware/validate.middleware";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";
import {
  createPaymentSchema,
  createPreferenceSchema,
  createSubscriptionSchema,
} from "./validators/mercadopago.validators";

// Inicializa o router
const router: Router = Router();

/**
 * Rotas para webhooks
 */
router.post("/webhook", webhookController.processWebhook);

/**
 * Rotas para pagamentos
 */
// Criar pagamento
router.post(
  "/payments",
  authenticate,
  validate(createPaymentSchema),
  paymentController.createPayment
);

// Obter detalhes de um pagamento
router.get("/payments/:id", authenticate, paymentController.getPayment);

// Fazer refund de um pagamento
router.post(
  "/payments/:id/refund",
  authenticate,
  authorize(["ADMIN"]), // Apenas administradores podem fazer refunds
  paymentController.refundPayment
);

/**
 * Rotas para preferências de pagamento
 */
// Criar preferência
router.post(
  "/preferences",
  authenticate,
  validate(createPreferenceSchema),
  preferenceController.createPreference
);

// Obter detalhes de uma preferência
router.get(
  "/preferences/:id",
  authenticate,
  preferenceController.getPreference
);

/**
 * Rotas para assinaturas
 */
// Criar assinatura
router.post(
  "/subscriptions",
  authenticate,
  validate(createSubscriptionSchema),
  subscriptionController.createSubscription
);

// Obter detalhes de uma assinatura
router.get(
  "/subscriptions/:id",
  authenticate,
  subscriptionController.getSubscription
);

// Atualizar uma assinatura
router.patch(
  "/subscriptions/:id",
  authenticate,
  subscriptionController.updateSubscription
);

// Cancelar uma assinatura
router.post(
  "/subscriptions/:id/cancel",
  authenticate,
  subscriptionController.cancelSubscription
);

// Pausar uma assinatura
router.post(
  "/subscriptions/:id/pause",
  authenticate,
  subscriptionController.pauseSubscription
);

// Reativar uma assinatura
router.post(
  "/subscriptions/:id/resume",
  authenticate,
  subscriptionController.resumeSubscription
);

// Exporta as rotas
export default router;
