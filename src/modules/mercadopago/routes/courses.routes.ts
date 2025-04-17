import { Router } from "express";
import { CoursePaymentController } from "../courses/controllers/course-payment.controller";
import { authenticate } from "@/shared/middleware/auth.middleware";
import { validate } from "@/shared/middleware/validate.middleware";
import { createCoursePaymentSchema } from "../validators/schemas/mercadopago.schema";

/**
 * Rotas para pagamentos de cursos
 */
const router: Router = Router();
const coursePaymentController = new CoursePaymentController();

// Criar pagamento para curso
router.post(
  "/payment",
  authenticate,
  validate(createCoursePaymentSchema),
  coursePaymentController.createCoursePayment
);

// Verificar status de pagamento
router.get(
  "/payment/:checkoutId",
  authenticate,
  coursePaymentController.checkPaymentStatus
);

// Verificar acesso a curso
router.get(
  "/access/:courseId",
  authenticate,
  coursePaymentController.checkCourseAccess
);

// Obter configurações de pagamento
router.get(
  "/payment-config",
  authenticate,
  coursePaymentController.getPaymentConfig
);

export default router;
