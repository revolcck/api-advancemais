/**
 * Rotas para pagamentos de cursos via MercadoPago
 * @module modules/mercadopago/routes/courses
 */
import { Router } from "express";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";
import { validate } from "@/shared/middleware/validate.middleware";
import { CoursePaymentController } from "../courses/controllers/course-payment.controller";
import { createCoursePaymentSchema } from "../validators/schemas/mercadopago.schema";

// Importação de constantes
import { COURSE_ROUTES } from "../constants/routes.constants";
import { PERMISSIONS } from "@/shared/constants/permissions.constants";

// Inicializa o router
const router: Router = Router();
const coursePaymentController = new CoursePaymentController();

/**
 * @route POST /api/mercadopago/courses/payment
 * @desc Cria uma preferência de pagamento para um curso
 * @access Privado (requer autenticação do usuário)
 */
router.post(
  COURSE_ROUTES.PAYMENT,
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
  COURSE_ROUTES.PAYMENT_STATUS,
  authenticate,
  coursePaymentController.checkPaymentStatus
);

/**
 * @route GET /api/mercadopago/courses/access/:courseId
 * @desc Verifica se um usuário tem acesso a um curso
 * @access Privado (requer autenticação do usuário)
 */
router.get(
  COURSE_ROUTES.ACCESS,
  authenticate,
  coursePaymentController.checkCourseAccess
);

/**
 * @route GET /api/mercadopago/courses/payment-config
 * @desc Obtém configurações de pagamento para o frontend
 * @access Privado (requer autenticação do usuário)
 */
router.get(
  COURSE_ROUTES.PAYMENT_CONFIG,
  authenticate,
  coursePaymentController.getPaymentConfig
);

/**
 * @route GET /api/mercadopago/courses/admin/payments
 * @desc Lista todos os pagamentos de cursos realizados (para administração)
 * @access Privado (requer permissão administrativa)
 */
router.get(
  COURSE_ROUTES.ADMIN_PAYMENTS,
  authenticate,
  authorize(PERMISSIONS.FINANCIAL),
  coursePaymentController.getPaymentConfig
);

export default router;
