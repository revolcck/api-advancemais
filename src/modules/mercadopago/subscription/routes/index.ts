/**
 * Rotas para módulo de assinatura
 * @module modules/mercadopago/subscription/routes
 */
import { Router } from "express";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";
import { validate } from "@/shared/middleware/validate.middleware";
import { SubscriptionController } from "../controllers/subscription.controller";
import { PlanController } from "../controllers/plan.controller";
import {
  createSubscriptionSchema,
  cancelSubscriptionSchema,
  adminUpdateSubscriptionSchema,
} from "../validators/subscription.validator";
import {
  createPlanSchema,
  updatePlanSchema,
} from "../validators/plan.validator";
import { PERMISSIONS } from "@/shared/constants/permissions.constants";

// Inicializa os routers
const router: Router = Router();
const subscriptionController = new SubscriptionController();
const planController = new PlanController();

// ==== IMPORTANTE: Rotas de planos ANTES das rotas com parâmetros /:id ====
// Rotas de planos
/**
 * @route GET /api/mercadopago/subscription/plans
 * @desc Lista todos os planos de assinatura
 * @access Público
 */
router.get("/plans", planController.listPlans);

/**
 * @route GET /api/mercadopago/subscription/plans/:id
 * @desc Obtém um plano de assinatura pelo ID
 * @access Público
 */
router.get("/plans/:id", planController.getPlan);

/**
 * @route POST /api/mercadopago/subscription/plans
 * @desc Cria um novo plano de assinatura
 * @access Privado (requer permissão administrativa)
 */
router.post(
  "/plans",
  authenticate,
  authorize(PERMISSIONS.ADMIN),
  validate(createPlanSchema),
  planController.createPlan
);

/**
 * @route PUT /api/mercadopago/subscription/plans/:id
 * @desc Atualiza um plano de assinatura existente
 * @access Privado (requer permissão administrativa)
 */
router.put(
  "/plans/:id",
  authenticate,
  authorize(PERMISSIONS.ADMIN),
  validate(updatePlanSchema),
  planController.updatePlan
);

/**
 * @route PATCH /api/mercadopago/subscription/plans/:id/activate
 * @desc Ativa um plano de assinatura
 * @access Privado (requer permissão administrativa)
 */
router.patch(
  "/plans/:id/activate",
  authenticate,
  authorize(PERMISSIONS.ADMIN),
  planController.activatePlan
);

/**
 * @route PATCH /api/mercadopago/subscription/plans/:id/deactivate
 * @desc Desativa um plano de assinatura
 * @access Privado (requer permissão administrativa)
 */
router.patch(
  "/plans/:id/deactivate",
  authenticate,
  authorize(PERMISSIONS.ADMIN),
  planController.deactivatePlan
);

// ==== Rotas de assinatura (após as rotas de planos) ====
// Rotas de assinatura
/**
 * @route POST /api/mercadopago/subscription
 * @desc Cria uma nova assinatura
 * @access Privado (requer autenticação do usuário)
 */
router.post(
  "/",
  authenticate,
  validate(createSubscriptionSchema),
  subscriptionController.createSubscription
);

/**
 * @route GET /api/mercadopago/subscription/:id
 * @desc Obtém detalhes de uma assinatura específica
 * @access Privado (requer autenticação e propriedade do recurso)
 */
router.get("/:id", authenticate, subscriptionController.getSubscription);

/**
 * @route GET /api/mercadopago/subscription
 * @desc Lista as assinaturas do usuário autenticado
 * @access Privado (requer autenticação)
 */
router.get("/", authenticate, subscriptionController.listSubscriptions);

/**
 * @route POST /api/mercadopago/subscription/:id/cancel
 * @desc Cancela uma assinatura
 * @access Privado (requer autenticação e propriedade do recurso)
 */
router.post(
  "/:id/cancel",
  authenticate,
  validate(cancelSubscriptionSchema),
  subscriptionController.cancelSubscription
);

/**
 * @route GET /api/mercadopago/subscription/check
 * @desc Verifica se o usuário tem assinatura ativa
 * @access Privado (requer autenticação)
 */
router.get(
  "/check",
  authenticate,
  subscriptionController.checkActiveSubscription
);

// Rotas administrativas para assinaturas
/**
 * @route GET /api/mercadopago/subscription/admin/list
 * @desc Lista todas as assinaturas (para administração)
 * @access Privado (requer permissão administrativa)
 */
router.get(
  "/admin/list",
  authenticate,
  authorize(PERMISSIONS.FINANCIAL),
  subscriptionController.listAllSubscriptions
);

/**
 * @route POST /api/mercadopago/subscription/admin/:id/update
 * @desc Atualiza uma assinatura (para administração)
 * @access Privado (requer permissão administrativa)
 */
router.post(
  "/admin/:id/update",
  authenticate,
  authorize(PERMISSIONS.FINANCIAL),
  validate(adminUpdateSubscriptionSchema),
  subscriptionController.updateSubscription
);

export default router;
