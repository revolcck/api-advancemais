/**
 * Rotas para pagamentos de cursos via MercadoPago
 */
import { Router } from "express";
import { CoursePaymentController } from "../courses/controllers/course-payment.controller";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";
import { validate } from "@/shared/middleware/validate.middleware";
import { createCoursePaymentSchema } from "../validators/schemas/mercadopago.schema";

// Inicializa o router
const router: Router = Router();
const coursePaymentController = new CoursePaymentController();

/**
 * @route POST /api/mercadopago/courses/payment
 * @desc Cria uma preferência de pagamento para um curso
 * @access Privado (requer autenticação do usuário)
 */
router.post(
  "/payment",
  authenticate,
  validate(createCoursePaymentSchema),
  coursePaymentController.createCoursePayment
);

/**
 * @route GET /api/mercadopago/courses/payment/:checkoutId
 * @desc Verifica o status de um pagamento de curso
 * @access Privado (requer autenticação do usuário)
 */
router.get(
  "/payment/:checkoutId",
  authenticate,
  coursePaymentController.checkPaymentStatus
);

/**
 * @route GET /api/mercadopago/courses/access/:courseId
 * @desc Verifica se um usuário tem acesso a um curso
 * @access Privado (requer autenticação do usuário)
 */
router.get(
  "/access/:courseId",
  authenticate,
  coursePaymentController.checkCourseAccess
);

/**
 * @route GET /api/mercadopago/courses/payment-config
 * @desc Obtém configurações de pagamento para o frontend
 * @access Privado (requer autenticação do usuário)
 */
router.get(
  "/payment-config",
  authenticate,
  coursePaymentController.getPaymentConfig
);

/**
 * @route GET /api/mercadopago/courses/admin/payments
 * @desc Lista todos os pagamentos de cursos realizados (para administração)
 * @access Privado (requer permissão administrativa)
 */
router.get(
  "/admin/payments",
  authenticate,
  authorize(["ADMIN", "Super Administrador", "Financeiro"]),
  coursePaymentController.getPaymentConfig
);

export default router;
