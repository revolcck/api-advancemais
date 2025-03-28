// src/modules/mercadopago/routes.ts

import { Router } from "express";
import MercadoPagoController from "./controllers/mercadopago.controller";
import { validate } from "@/shared/middleware/validate.middleware";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";
import {
  createPaymentSchema,
  capturePaymentSchema,
  createSubscriptionSchema,
  updateSubscriptionStatusSchema,
  updateSubscriptionAmountSchema,
  webhookSchema,
} from "./validators/mercadopago.validators";

/**
 * Inicializa o router para as rotas do Mercado Pago
 */
const router: Router = Router();

/**
 * @route GET /api/mercadopago/test-connectivity
 * @desc Testa a conectividade com a API do Mercado Pago
 * @access Privado (Admin)
 */
router.get(
  "/test-connectivity",
  authenticate,
  authorize(["ADMIN"]),
  MercadoPagoController.testConnectivity
);

/**
 * @route GET /api/mercadopago/public-key
 * @desc Obtém a chave pública para uso no frontend
 * @access Público
 */
router.get("/public-key", MercadoPagoController.getPublicKey);

/**
 * ROTAS DE PAGAMENTOS
 */

/**
 * @route POST /api/mercadopago/payments
 * @desc Cria um novo pagamento
 * @access Privado
 */
router.post(
  "/payments",
  authenticate,
  validate(createPaymentSchema),
  MercadoPagoController.createPayment
);

/**
 * @route GET /api/mercadopago/payments/:id
 * @desc Obtém informações de um pagamento
 * @access Privado
 */
router.get("/payments/:id", authenticate, MercadoPagoController.getPaymentInfo);

/**
 * @route POST /api/mercadopago/payments/:id/capture
 * @desc Captura um pagamento autorizado
 * @access Privado (Admin/Instructor)
 */
router.post(
  "/payments/:id/capture",
  authenticate,
  authorize(["ADMIN", "INSTRUCTOR"]),
  validate(capturePaymentSchema),
  MercadoPagoController.capturePayment
);

/**
 * @route POST /api/mercadopago/payments/:id/cancel
 * @desc Cancela um pagamento
 * @access Privado (Admin/Instructor)
 */
router.post(
  "/payments/:id/cancel",
  authenticate,
  authorize(["ADMIN", "INSTRUCTOR"]),
  MercadoPagoController.cancelPayment
);

/**
 * ROTAS DE ASSINATURAS
 */

/**
 * @route POST /api/mercadopago/subscriptions
 * @desc Cria uma nova assinatura
 * @access Privado
 */
router.post(
  "/subscriptions",
  authenticate,
  validate(createSubscriptionSchema),
  MercadoPagoController.createSubscription
);

/**
 * @route GET /api/mercadopago/subscriptions/:id
 * @desc Obtém informações de uma assinatura
 * @access Privado
 */
router.get(
  "/subscriptions/:id",
  authenticate,
  MercadoPagoController.getSubscriptionInfo
);

/**
 * @route POST /api/mercadopago/subscriptions/:id/cancel
 * @desc Cancela uma assinatura
 * @access Privado (Owner/Admin)
 */
router.post(
  "/subscriptions/:id/cancel",
  authenticate,
  MercadoPagoController.cancelSubscription
);

/**
 * @route PATCH /api/mercadopago/subscriptions/:id/status
 * @desc Atualiza o status de uma assinatura (pausa ou reativa)
 * @access Privado (Owner/Admin)
 */
router.patch(
  "/subscriptions/:id/status",
  authenticate,
  validate(updateSubscriptionStatusSchema),
  MercadoPagoController.updateSubscriptionStatus
);

/**
 * @route PATCH /api/mercadopago/subscriptions/:id/amount
 * @desc Atualiza o valor de uma assinatura
 * @access Privado (Admin)
 */
router.patch(
  "/subscriptions/:id/amount",
  authenticate,
  authorize(["ADMIN"]),
  validate(updateSubscriptionAmountSchema),
  MercadoPagoController.updateSubscriptionAmount
);

/**
 * @route POST /api/mercadopago/webhook
 * @desc Recebe notificações webhook do Mercado Pago
 * @access Público
 */
router.post("/webhook", MercadoPagoController.processWebhook);

/**
 * Exporta o router do módulo
 */
export default router;
