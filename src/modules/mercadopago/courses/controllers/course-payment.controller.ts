import { Request, Response } from "express";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { logger } from "@/shared/utils/logger.utils";
import { CoursePaymentService } from "../services/course-payment.service";
import { PaymentService } from "../../core/services/payment.service";
import { AuditService } from "@/shared/services/audit.service";
import { ValidationError } from "@/shared/errors/AppError";

/**
 * Controlador para operações de pagamento de cursos com MercadoPago
 */
export class CoursePaymentController {
  private coursePaymentService: CoursePaymentService;
  private paymentService: PaymentService;

  constructor() {
    this.coursePaymentService = new CoursePaymentService();
    this.paymentService = new PaymentService();
  }

  /**
   * Cria preferência de pagamento para um curso
   * @route POST /api/mercadopago/courses/payment
   */
  public createCoursePayment = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      logger.info("Iniciando criação de pagamento para curso");

      // O usuário já foi autenticado pelo middleware
      const userId = req.user!.id;
      const { courseId, paymentMethodId, couponId, installments } = req.body;

      // Valida os dados obrigatórios
      if (!courseId) {
        throw new ValidationError("ID do curso é obrigatório");
      }

      if (!paymentMethodId) {
        throw new ValidationError("Método de pagamento é obrigatório");
      }

      // Cria a preferência de pagamento
      const paymentPreference =
        await this.coursePaymentService.createCoursePayment(
          courseId,
          userId,
          paymentMethodId,
          couponId,
          installments
        );

      // Registra ação de auditoria
      AuditService.log(
        "course_payment_preference_created",
        "payment",
        paymentPreference.preferenceId,
        userId,
        {
          courseId,
          checkoutId: paymentPreference.checkoutId,
        },
        req
      );

      // Sucesso: retorna dados para iniciar o pagamento
      ApiResponse.success(res, paymentPreference, {
        message: "Preferência de pagamento criada com sucesso",
        statusCode: 201,
      });
    } catch (error) {
      logger.error("Erro ao criar pagamento para curso", error);
      throw error;
    }
  };

  /**
   * Verifica o status de um pagamento de curso
   * @route GET /api/mercadopago/courses/payment/:checkoutId
   */
  public checkPaymentStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const checkoutId = req.params.checkoutId;

      logger.info(`Verificando status do pagamento ${checkoutId}`);

      // Verifica o status no serviço
      const paymentStatus = await this.coursePaymentService.checkPaymentStatus(
        checkoutId
      );

      // Sucesso: retorna o status
      ApiResponse.success(res, paymentStatus);
    } catch (error) {
      logger.error(
        `Erro ao verificar status do pagamento ${req.params.checkoutId}`,
        error
      );
      throw error;
    }
  };

  /**
   * Verifica se um usuário tem acesso a um curso
   * @route GET /api/mercadopago/courses/access/:courseId
   */
  public checkCourseAccess = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const courseId = req.params.courseId;
      const userId = req.user!.id;

      logger.info(
        `Verificando acesso ao curso ${courseId} para usuário ${userId}`
      );

      // Verifica o acesso
      const accessStatus = await this.coursePaymentService.checkCourseAccess(
        userId,
        courseId
      );

      // Sucesso: retorna o status de acesso
      ApiResponse.success(res, accessStatus);
    } catch (error) {
      logger.error(
        `Erro ao verificar acesso ao curso ${req.params.courseId}`,
        error
      );
      throw error;
    }
  };

  /**
   * Obtém as configurações de pagamento para o frontend
   * @route GET /api/mercadopago/courses/payment-config
   */
  public getPaymentConfig = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      logger.info("Obtendo configurações de pagamento para cursos");

      // Obtém configurações do serviço de pagamento
      const config = this.paymentService.getPaymentConfig();

      // Sucesso: retorna configurações
      ApiResponse.success(res, {
        ...config,
        methods: ["credit_card", "debit_card", "pix", "ticket"],
        installments: {
          maxInstallments: 12,
          freeInstallments: 3,
        },
      });
    } catch (error) {
      logger.error("Erro ao obter configurações de pagamento", error);
      throw error;
    }
  };
}
