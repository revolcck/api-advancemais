import { Router } from "express";
import { SubscriptionController } from "../subscriber/controllers/subscription.controller";
import { authenticate } from "@/shared/middleware/auth.middleware";
import { validate } from "@/shared/middleware/validate.middleware";
import {
  createSubscriptionSchema,
  cancelSubscriptionSchema,
} from "../subscriber/validators/subscription.validator";

/**
 * Rotas para gerenciamento de assinaturas
 */
const router: Router = Router();
const subscriptionController = new SubscriptionController();

// Criar nova assinatura
router.post(
  "/",
  authenticate,
  validate(createSubscriptionSchema),
  subscriptionController.createSubscription
);

// Obter detalhes de uma assinatura
router.get("/:id", authenticate, subscriptionController.getSubscription);

// Listar assinaturas do usuário
router.get("/", authenticate, subscriptionController.listSubscriptions);

// Cancelar uma assinatura
router.post(
  "/:id/cancel",
  authenticate,
  validate(cancelSubscriptionSchema),
  subscriptionController.cancelSubscription
);

// Verificar assinatura ativa
router.get(
  "/check",
  authenticate,
  subscriptionController.checkActiveSubscription
);

export default router;
