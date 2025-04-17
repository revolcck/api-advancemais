/**
 * Rotas para pagamentos de cursos via MercadoPago
 */
import { Router } from "express";
import { CoursePaymentController } from "../courses/controllers/course-payment.controller";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";
import { validate } from "@/shared/middleware/validate.middleware";
import { createCoursePaymentSchema } from "../validators/schemas/mercadopago.schema";

// Constantes de roles do sistema
const ADMIN_ROLES = ["Super Administrador", "Administrador"];
const FINANCE_ROLES = [...ADMIN_ROLES, "Setor Pedagógico", "RH"];
const STUDENT_ROLES = ["Aluno"];
const PROFESSOR_ROLES = ["Professor"];
const ALL_ROLES = [
  ...ADMIN_ROLES,
  ...FINANCE_ROLES,
  ...STUDENT_ROLES,
  ...PROFESSOR_ROLES,
  "Empresa",
  "Recrutadores",
];

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
  authorize(FINANCE_ROLES),
  coursePaymentController.getPaymentConfig // Substituir pelo método adequado quando implementado
);

/**
 * @route POST /api/mercadopago/courses/admin/refund/:paymentId
 * @desc Permite que administradores reembolsem um pagamento
 * @access Privado (requer permissão administrativa)
 */
router.post(
  "/admin/refund/:paymentId",
  authenticate,
  authorize(ADMIN_ROLES),
  coursePaymentController.getPaymentConfig // Substituir pelo método adequado quando implementado
);

export default router;
