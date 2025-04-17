/**
 * Rotas para gerenciamento de assinaturas via MercadoPago
 */
import { Router } from "express";
import { SubscriptionController } from "../subscriber/controllers/subscription.controller";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";
import { validate } from "@/shared/middleware/validate.middleware";
import {
  createSubscriptionSchema,
  cancelSubscriptionSchema,
} from "../subscriber/validators/subscription.validator";

const router: Router = Router();
const subscriptionController = new SubscriptionController();

/**
 * @route POST /api/mercadopago/subscriber
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
 * @route GET /api/mercadopago/subscriber/:id
 * @desc Obtém detalhes de uma assinatura específica
 * @access Privado (requer autenticação e propriedade do recurso)
 */
router.get("/:id", authenticate, subscriptionController.getSubscription);

/**
 * @route GET /api/mercadopago/subscriber
 * @desc Lista as assinaturas do usuário autenticado
 * @access Privado (requer autenticação)
 */
router.get("/", authenticate, subscriptionController.listSubscriptions);

/**
 * @route POST /api/mercadopago/subscriber/:id/cancel
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
 * @route GET /api/mercadopago/subscriber/check
 * @desc Verifica se o usuário tem assinatura ativa
 * @access Privado (requer autenticação)
 */
router.get(
  "/check",
  authenticate,
  subscriptionController.checkActiveSubscription
);

/**
 * @route GET /api/mercadopago/subscriber/admin/list
 * @desc Lista todas as assinaturas (para administração)
 * @access Privado (requer permissão administrativa)
 */
router.get(
  "/admin/list",
  authenticate,
  authorize(["ADMIN", "Super Administrador", "Financeiro"]),
  subscriptionController.listSubscriptions
);

/**
 * @route POST /api/mercadopago/subscriber/admin/:id/update
 * @desc Atualiza uma assinatura (para administração)
 * @access Privado (requer permissão administrativa)
 */
router.post(
  "/admin/:id/update",
  authenticate,
  authorize(["ADMIN", "Super Administrador", "Financeiro"]),
  subscriptionController.cancelSubscription
);

export default router;
