/**
 * Rotas para o módulo MercadoPago
 * @module modules/mercadopago/routes
 */

import { Router } from "express";
import { webhookController } from "./controllers/webhook.controller";
import { paymentController } from "./controllers/payment.controller";
import { subscriptionController } from "./controllers/subscription.controller";
import { preferenceController } from "./controllers/preference.controller";
import { mercadoPagoConfig } from "./config/mercadopago.config";
import { validate } from "@/shared/middleware/validate.middleware";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";
import {
  createPaymentSchema,
  createPreferenceSchema,
  createSubscriptionSchema,
  refundPaymentSchema,
  updateSubscriptionAmountSchema,
  updateSubscriptionStatusSchema,
  webhookSchema,
} from "./validators/mercadopago.validators";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { ServiceUnavailableError } from "@/shared/errors/AppError";

// Inicializa o router
const router: Router = Router();

/**
 * @route GET /api/mercadopago/status
 * @desc Verifica o status da integração com o MercadoPago
 * @access Público
 */
router.get("/status", (req, res) => {
  try {
    if (!mercadoPagoConfig.isAvailable()) {
      throw new ServiceUnavailableError(
        "Serviço do MercadoPago não está disponível",
        "MERCADOPAGO_SERVICE_UNAVAILABLE"
      );
    }

    const isTestMode = mercadoPagoConfig.isTestMode();

    ApiResponse.success(
      res,
      {
        available: true,
        testMode: isTestMode,
      },
      {
        message: "Serviço do MercadoPago está disponível",
        statusCode: 200,
      }
    );
  } catch (error) {
    if (error instanceof ServiceUnavailableError) {
      ApiResponse.error(res, error.message, {
        code: error.errorCode,
        statusCode: error.statusCode,
      });
    } else {
      ApiResponse.error(res, "Erro ao verificar status do MercadoPago", {
        code: "MERCADOPAGO_STATUS_ERROR",
        statusCode: 500,
      });
    }
  }
});

/**
 * @route GET /api/mercadopago/public-key
 * @desc Obtém a chave pública para uso no frontend
 * @access Público
 */
router.get("/public-key", (req, res) => {
  try {
    if (!mercadoPagoConfig.isAvailable()) {
      throw new ServiceUnavailableError(
        "Serviço do MercadoPago não está disponível",
        "MERCADOPAGO_SERVICE_UNAVAILABLE"
      );
    }

    const publicKey = mercadoPagoConfig.getPublicKey();
    const isTestMode = mercadoPagoConfig.isTestMode();

    ApiResponse.success(
      res,
      {
        publicKey,
        isTestMode,
      },
      {
        message: "Chave pública do MercadoPago obtida com sucesso",
        statusCode: 200,
      }
    );
  } catch (error) {
    if (error instanceof ServiceUnavailableError) {
      ApiResponse.error(res, error.message, {
        code: error.errorCode,
        statusCode: error.statusCode,
      });
    } else {
      ApiResponse.error(res, "Erro ao obter chave pública do MercadoPago", {
        code: "MERCADOPAGO_PUBLIC_KEY_ERROR",
        statusCode: 500,
      });
    }
  }
});

/**
 * Rotas para webhooks
 */
router.post(
  "/webhook",
  validate(webhookSchema),
  webhookController.processWebhook
);
router.post(
  "/webhook/subscription",
  validate(webhookSchema),
  webhookController.processSubscriptionWebhook
);
router.post(
  "/webhook/payment",
  validate(webhookSchema),
  webhookController.processPaymentWebhook
);

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

// Pesquisar pagamentos
router.get("/payments/search", authenticate, paymentController.searchPayments);

// Fazer refund de um pagamento
router.post(
  "/payments/:id/refund",
  authenticate,
  authorize(["ADMIN"]), // Apenas administradores podem fazer refunds
  validate(refundPaymentSchema),
  paymentController.refundPayment
);

// Capturar um pagamento
router.post(
  "/payments/:id/capture",
  authenticate,
  authorize(["ADMIN"]), // Apenas administradores podem capturar pagamentos
  paymentController.capturePayment
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

// Atualizar uma preferência
router.patch(
  "/preferences/:id",
  authenticate,
  preferenceController.updatePreference
);

// Pesquisar preferências
router.get(
  "/preferences/search",
  authenticate,
  preferenceController.searchPreferences
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

// Pesquisar assinaturas
router.get(
  "/subscriptions/search",
  authenticate,
  subscriptionController.searchSubscriptions
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

// Atualizar valor de uma assinatura
router.patch(
  "/subscriptions/:id/amount",
  authenticate,
  validate(updateSubscriptionAmountSchema),
  subscriptionController.updateSubscriptionAmount
);

// Exporta as rotas
export default router;
