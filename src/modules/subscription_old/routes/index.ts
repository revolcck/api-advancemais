/**
 * Rotas para o módulo de assinaturas
 * @module modules/subscription/routes
 */

import { Router, Request, Response, NextFunction } from "express";
import { planController } from "../controllers/plan.controller";
import { subscriptionController } from "../controllers/subscription.controller";
import { webhookController } from "../controllers/webhook.controller";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";
import { subscriptionConfig } from "../config/subscription.config";
import { ApiResponse } from "@/shared/utils/api-response.utils"; // Importação adicionada
import {
  requireActiveSubscription,
  requirePlanFeature,
  checkJobOfferLimit,
} from "../middleware/subscription.middleware";

// Cria o router
const router: Router = Router();

// Middleware para verificar se o módulo está habilitado
const checkModuleEnabled = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!subscriptionConfig.isEnabled()) {
    res.status(404).json({
      status: "error",
      message: "Módulo de assinaturas não está habilitado",
      code: "MODULE_DISABLED",
    });
    return;
  }
  next();
};

// Aplica o middleware a todas as rotas, exceto webhooks
router.use(/^(?!\/webhooks).*$/, checkModuleEnabled);

/**
 * Rotas de planos
 */

/**
 * @route GET /api/subscription/plans
 * @desc Lista todos os planos de assinatura
 * @access Público
 */
router.get("/plans", planController.getAllPlans);

/**
 * @route GET /api/subscription/plans/active
 * @desc Lista apenas planos ativos
 * @access Público
 */
router.get("/plans/active", planController.getActivePlans);

/**
 * @route GET /api/subscription/plans/:id
 * @desc Obtém um plano pelo ID
 * @access Público
 */
router.get("/plans/:id", planController.getPlanById);

/**
 * @route POST /api/subscription/plans
 * @desc Cria um novo plano de assinatura
 * @access Privado (apenas admin)
 */
router.post(
  "/plans",
  authenticate,
  authorize(["ADMIN", "Super Administrador"]),
  planController.validateCreatePlan,
  planController.createPlan
);

/**
 * @route PUT /api/subscription/plans/:id
 * @desc Atualiza um plano existente
 * @access Privado (apenas admin)
 */
router.put(
  "/plans/:id",
  authenticate,
  authorize(["ADMIN", "Super Administrador"]),
  planController.validateUpdatePlan,
  planController.updatePlan
);

/**
 * @route DELETE /api/subscription/plans/:id
 * @desc Exclui um plano existente
 * @access Privado (apenas admin)
 */
router.delete(
  "/plans/:id",
  authenticate,
  authorize(["ADMIN", "Super Administrador"]),
  planController.deletePlan
);

/**
 * @route PATCH /api/subscription/plans/:id/status
 * @desc Altera o status de um plano (ativo/inativo)
 * @access Privado (apenas admin)
 */
router.patch(
  "/plans/:id/status",
  authenticate,
  authorize(["ADMIN", "Super Administrador"]),
  planController.togglePlanStatus
);

/**
 * Rotas de assinaturas
 */

/**
 * @route GET /api/subscription/payment-methods
 * @desc Lista os métodos de pagamento disponíveis
 * @access Público
 */
router.get("/payment-methods", subscriptionController.getPaymentMethods);

/**
 * @route GET /api/subscription/status
 * @desc Verifica o status da assinatura do usuário atual
 * @access Privado
 */
router.get(
  "/status",
  authenticate,
  subscriptionController.checkSubscriptionStatus
);

/**
 * @route POST /api/subscription/sync/:id
 * @desc Sincroniza o status da assinatura com o Mercado Pago
 * @access Privado (dono da assinatura ou admin)
 */
router.post(
  "/sync/:id",
  authenticate,
  subscriptionController.syncSubscriptionStatus
);

/**
 * @route GET /api/subscription/my-subscriptions
 * @desc Lista assinaturas do usuário autenticado
 * @access Privado
 */
router.get(
  "/my-subscriptions",
  authenticate,
  subscriptionController.getMySubscriptions
);

/**
 * @route GET /api/subscription/subscriptions/:id
 * @desc Obtém uma assinatura pelo ID
 * @access Privado (dono da assinatura ou admin)
 */
router.get(
  "/subscriptions/:id",
  authenticate,
  subscriptionController.getSubscriptionById
);

/**
 * @route POST /api/subscription/subscriptions
 * @desc Cria uma nova assinatura manualmente
 * @access Privado (apenas admin)
 */
router.post(
  "/subscriptions",
  authenticate,
  authorize(["ADMIN", "Super Administrador", "Financeiro"]),
  subscriptionController.validateCreateSubscription,
  subscriptionController.createSubscription
);

/**
 * @route POST /api/subscription/checkout
 * @desc Inicia o processo de checkout para nova assinatura
 * @access Privado
 */
router.post(
  "/checkout",
  authenticate,
  subscriptionController.validateInitCheckout,
  subscriptionController.initCheckout
);

/**
 * @route PUT /api/subscription/subscriptions/:id
 * @desc Atualiza uma assinatura existente
 * @access Privado (apenas admin)
 */
router.put(
  "/subscriptions/:id",
  authenticate,
  authorize(["ADMIN", "Super Administrador", "Financeiro"]),
  subscriptionController.validateUpdateSubscription,
  subscriptionController.updateSubscription
);

/**
 * @route POST /api/subscription/subscriptions/:id/cancel
 * @desc Cancela uma assinatura
 * @access Privado (dono da assinatura ou admin)
 */
router.post(
  "/subscriptions/:id/cancel",
  authenticate,
  subscriptionController.cancelSubscription
);

/**
 * @route POST /api/subscription/subscriptions/:id/pause
 * @desc Pausa uma assinatura
 * @access Privado (dono da assinatura ou admin)
 */
router.post(
  "/subscriptions/:id/pause",
  authenticate,
  subscriptionController.pauseSubscription
);

/**
 * @route POST /api/subscription/subscriptions/:id/resume
 * @desc Retoma uma assinatura pausada
 * @access Privado (dono da assinatura ou admin)
 */
router.post(
  "/subscriptions/:id/resume",
  authenticate,
  subscriptionController.resumeSubscription
);

/**
 * @route POST /api/subscription/subscriptions/:id/renew
 * @desc Renova manualmente uma assinatura
 * @access Privado (apenas admin)
 */
router.post(
  "/subscriptions/:id/renew",
  authenticate,
  authorize(["ADMIN", "Super Administrador", "Financeiro"]),
  subscriptionController.renewSubscription
);

/**
 * Exemplos de rotas que utilizam os middlewares de verificação de assinatura
 */

/**
 * @route GET /api/subscription/premium-content
 * @desc Acessa conteúdo premium (exige assinatura ativa)
 * @access Privado (requer assinatura ativa)
 */
router.get(
  "/premium-content",
  authenticate,
  requireActiveSubscription,
  (req, res) => {
    ApiResponse.success(res, {
      content: "Conteúdo premium disponível apenas para assinantes",
      planInfo: req.subscriptionPlan,
    });
  }
);

/**
 * @route GET /api/subscription/advanced-features
 * @desc Acessa recursos avançados (exige plano com feature específica)
 * @access Privado (requer plano com recurso específico)
 */
router.get(
  "/advanced-features",
  authenticate,
  requireActiveSubscription,
  requirePlanFeature("advancedFeatures"),
  (req, res) => {
    ApiResponse.success(res, {
      message: "Você tem acesso aos recursos avançados",
      features: req.subscriptionPlan.features.advancedFeatures,
    });
  }
);

/**
 * @route POST /api/subscription/job-offers
 * @desc Cria uma nova vaga (sujeito ao limite do plano)
 * @access Privado (verifica limite de vagas do plano)
 */
router.post(
  "/job-offers",
  authenticate,
  requireActiveSubscription,
  checkJobOfferLimit,
  (req, res) => {
    ApiResponse.success(res, {
      message: "Vaga criada com sucesso",
      remainingJobOffers:
        (req.subscriptionPlan.maxJobOffers || 0) -
        ((req.subscription.usedJobOffers || 0) + 1),
    });
  }
);

/**
 * Rotas de webhooks
 */

/**
 * @route POST /api/subscription/webhooks
 * @desc Endpoint para receber webhooks do MercadoPago
 * @access Público (necessário para integrações)
 */
router.post(
  "/webhooks",
  webhookController.validateWebhook,
  webhookController.processWebhook
);

/**
 * @route POST /api/subscription/webhooks/verify
 * @desc Verifica a assinatura de um webhook
 * @access Privado (apenas admin)
 */
router.post(
  "/webhooks/verify",
  authenticate,
  authorize(["ADMIN", "Super Administrador"]),
  webhookController.validateWebhookVerification,
  webhookController.verifyWebhook
);

/**
 * @route GET /api/subscription/webhooks/history
 * @desc Lista o histórico de webhooks recebidos
 * @access Privado (apenas admin)
 */
router.get(
  "/webhooks/history",
  authenticate,
  authorize(["ADMIN", "Super Administrador", "Financeiro"]),
  webhookController.getWebhookHistory
);

export default router;
