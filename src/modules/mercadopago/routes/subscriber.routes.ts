/**
 * Rotas para gerenciamento de assinaturas via MercadoPago
 * @module modules/mercadopago/routes/subscriber
 */
import { Router } from "express";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";
import { validate } from "@/shared/middleware/validate.middleware";
import { SubscriptionController } from "../subscriber/controllers/subscription.controller";
import {
  createSubscriptionSchema,
  cancelSubscriptionSchema,
} from "../subscriber/validators/subscription.validator";

// Importação de constantes
import { SUBSCRIBER_ROUTES } from "../constants/routes.constants";
import { PERMISSIONS } from "@/shared/constants/permissions.constants";

// Inicializa o router
const router: Router = Router();
const subscriptionController = new SubscriptionController();

/**
 * @route POST /api/mercadopago/subscriber
 * @desc Cria uma nova assinatura
 * @access Privado (requer autenticação do usuário)
 */
router.post(
  SUBSCRIBER_ROUTES.ROOT,
  authenticate,
  validate(createSubscriptionSchema),
  subscriptionController.createSubscription
);

/**
 * @route GET /api/mercadopago/subscriber/:id
 * @desc Obtém detalhes de uma assinatura específica
 * @access Privado (requer autenticação e propriedade do recurso)
 */
router.get(
  SUBSCRIBER_ROUTES.SUBSCRIPTION,
  authenticate,
  subscriptionController.getSubscription
);

/**
 * @route GET /api/mercadopago/subscriber
 * @desc Lista as assinaturas do usuário autenticado
 * @access Privado (requer autenticação)
 */
router.get(
  SUBSCRIBER_ROUTES.ROOT,
  authenticate,
  subscriptionController.listSubscriptions
);

/**
 * @route POST /api/mercadopago/subscriber/:id/cancel
 * @desc Cancela uma assinatura
 * @access Privado (requer autenticação e propriedade do recurso)
 */
router.post(
  SUBSCRIBER_ROUTES.CANCEL,
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
  SUBSCRIBER_ROUTES.CHECK,
  authenticate,
  subscriptionController.checkActiveSubscription
);

/**
 * @route GET /api/mercadopago/subscriber/admin/list
 * @desc Lista todas as assinaturas (para administração)
 * @access Privado (requer permissão administrativa)
 */
router.get(
  SUBSCRIBER_ROUTES.ADMIN_LIST,
  authenticate,
  authorize(PERMISSIONS.FINANCIAL),
  subscriptionController.listSubscriptions
);

/**
 * @route POST /api/mercadopago/subscriber/admin/:id/update
 * @desc Atualiza uma assinatura (para administração)
 * @access Privado (requer permissão administrativa)
 */
router.post(
  SUBSCRIBER_ROUTES.ADMIN_UPDATE,
  authenticate,
  authorize(PERMISSIONS.FINANCIAL),
  subscriptionController.cancelSubscription
);

export default router;
