import { logger } from "@/shared/utils/logger.utils";
import { PaymentService } from "../../core/services/payment.service";
import { prisma } from "@/config/database";
import { ICoursePaymentService } from "../interfaces/course-payment.interface";
import {
  CustomerInfo,
  PurchaseItem,
} from "../../core/interfaces/payment.interface";
import {
  MercadoPagoPaymentStatus,
  PaymentResponseDto,
  PaymentStatusDto,
} from "../../dto/payment.dto";
import { AuditService } from "@/shared/services/audit.service";
import {
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from "@/shared/errors/AppError";
import { formatRequestMetadata } from "../../utils/mercadopago.util";
import { env } from "@/config/environment";

/**
 * Serviço para processamento de pagamentos de cursos via MercadoPago
 */
export class CoursePaymentService implements ICoursePaymentService {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Cria uma preferência de pagamento para compra de curso
   */
  public async createCoursePayment(
    courseId: string,
    userId: string,
    paymentMethodId: string,
    couponId?: string,
    installments: number = 1
  ): Promise<PaymentResponseDto> {
    try {
      logger.info(`Criando preferência de pagamento para curso ${courseId}`);

      // Busca informações do curso
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          category: true,
        },
      });

      if (!course) {
        throw new NotFoundError("Curso", "COURSE_NOT_FOUND");
      }

      if (!course.price) {
        throw new ValidationError("Curso não possui preço definido");
      }

      // Verifica se o usuário já está matriculado neste curso
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: {
          userId,
          courseId,
          status: {
            in: ["ACTIVE", "COMPLETED", "PENDING_PAYMENT"],
          },
        },
      });

      if (existingEnrollment) {
        if (existingEnrollment.status === "PENDING_PAYMENT") {
          throw new ValidationError(
            "Você já possui uma matrícula pendente para este curso"
          );
        } else {
          throw new ValidationError("Você já está matriculado neste curso");
        }
      }

      // Busca informações do usuário
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          personalInfo: true,
          companyInfo: true,
          address: true,
        },
      });

      if (!user) {
        throw new NotFoundError("Usuário", "USER_NOT_FOUND");
      }

      // Prepara item para compra
      const item: PurchaseItem = {
        id: course.id,
        title: `Curso: ${course.title}`,
        description: course.description?.substring(0, 255) || course.title,
        quantity: 1,
        unit_price: Number(course.price),
        picture_url: course.thumbnailUrl || undefined, // Converte null para undefined
        category_id: course.category?.name,
      };

      // Prepara informações do cliente
      const customerInfo: CustomerInfo = {
        name:
          user.userType === "PESSOA_FISICA"
            ? user.personalInfo?.name || ""
            : user.companyInfo?.companyName || "",
        email: user.email,
      };

      // Adiciona documento (CPF/CNPJ) se disponível
      if (user.personalInfo?.cpf) {
        customerInfo.identification = {
          type: "CPF",
          number: user.personalInfo.cpf,
        };
      } else if (user.companyInfo?.cnpj) {
        customerInfo.identification = {
          type: "CNPJ",
          number: user.companyInfo.cnpj,
        };
      }

      // Adiciona telefone se disponível
      if (user.personalInfo?.phone || user.companyInfo?.phone) {
        const phone = (
          user.personalInfo?.phone ||
          user.companyInfo?.phone ||
          ""
        ).replace(/\D/g, "");

        if (phone.length >= 10) {
          customerInfo.phone = {
            area_code: phone.substring(0, 2),
            number: phone.substring(2),
          };
        }
      }

      // Adiciona endereço se disponível
      if (user.address) {
        customerInfo.address = {
          zip_code: user.address.zipCode.replace(/\D/g, ""),
          street_name: user.address.street,
          street_number: user.address.number,
          neighborhood: user.address.neighborhood,
          city: user.address.city,
          state: user.address.state,
        };
      }

      // Calcula desconto se houver cupom
      let discountAmount: number | null = null;
      let originalPrice: number | null = null;

      if (couponId) {
        const coupon = await prisma.coupon.findUnique({
          where: { id: couponId },
        });

        if (coupon && coupon.status === "ACTIVE") {
          // Verifica se o cupom está válido (data)
          const now = new Date();
          if (now >= coupon.startDate && now <= coupon.endDate) {
            // Aplica o desconto
            originalPrice = Number(course.price);

            if (coupon.discountType === "PERCENTAGE") {
              discountAmount =
                (originalPrice * Number(coupon.discountValue)) / 100;
            } else {
              discountAmount = Number(coupon.discountValue);
            }

            // Verifica limite máximo de desconto
            if (
              coupon.maxDiscountAmount &&
              discountAmount > Number(coupon.maxDiscountAmount)
            ) {
              discountAmount = Number(coupon.maxDiscountAmount);
            }

            // Garante que o desconto não seja maior que o preço
            if (discountAmount > originalPrice) {
              discountAmount = originalPrice;
            }

            // Atualiza o preço do item com desconto
            item.unit_price = originalPrice - discountAmount;
          }
        }
      }

      // Prepara metadados
      const metadata = formatRequestMetadata({
        userId,
        courseId,
        courseName: course.title,
        paymentMethodId,
        couponId,
        originalPrice,
        discountAmount,
        installments,
      });

      // Cria a sessão de checkout no banco de dados
      const checkoutSession = await prisma.checkoutSession.create({
        data: {
          status: "pending",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
          planId: "00000000-0000-0000-0000-000000000000", // Placeholder para compra avulsa
          paymentMethodId,
          userId,
          couponId,
          discountAmount: discountAmount ? discountAmount : undefined,
          originalPrice: originalPrice ? originalPrice : undefined,
          successUrl: `${env.frontendUrl}/cursos/checkout/success?courseId=${courseId}`,
          cancelUrl: `${env.frontendUrl}/cursos/checkout/cancel?courseId=${courseId}`,
          callbackUrl: `${env.appUrl}/api/mercadopago/webhooks`,
          metadataJson: {
            courseId,
            userId,
            paymentType: "course",
          },
        },
      });

      // Configura métodos de pagamento conforme o caso
      const paymentMethods = {
        installments: installments || 1,
      };

      // Cria a preferência de pagamento no MercadoPago
      const preference = await this.paymentService.createPaymentPreference(
        {
          items: [item],
          payer: customerInfo,
          back_urls: {
            success: `${env.frontendUrl}/cursos/checkout/success?courseId=${courseId}&checkoutId=${checkoutSession.id}`,
            failure: `${env.frontendUrl}/cursos/checkout/failure?courseId=${courseId}&checkoutId=${checkoutSession.id}`,
            pending: `${env.frontendUrl}/cursos/checkout/pending?courseId=${courseId}&checkoutId=${checkoutSession.id}`,
          },
          auto_return: "approved",
          notification_url: `${env.appUrl}/api/mercadopago/webhooks`,
          external_reference: checkoutSession.id,
          statement_descriptor: "CURSO_PLATAFORMA",
          payment_methods: paymentMethods,
          metadata,
        },
        userId
      );

      // Atualiza a sessão de checkout com os dados do MercadoPago
      await prisma.checkoutSession.update({
        where: { id: checkoutSession.id },
        data: {
          mpPreferenceId: preference.preferenceId,
          mpInitPoint: preference.initPoint,
          mpSandboxInitPoint: preference.sandboxInitPoint,
        },
      });

      // Cria uma matrícula pendente
      await prisma.enrollment.create({
        data: {
          userId,
          courseId,
          status: "PENDING_PAYMENT",
          progress: 0,
          enrollmentDate: new Date(),
          expirationDate: new Date(
            Date.now() + (course.accessPeriod || 365) * 24 * 60 * 60 * 1000
          ),
          supportExpiration: course.supportPeriod
            ? new Date(Date.now() + course.supportPeriod * 24 * 60 * 60 * 1000)
            : null,
          price: item.unit_price,
          paymentId: preference.preferenceId,
          totalLessons: 0, // Será atualizado quando o pagamento for confirmado
        },
      });

      // Registra ação de auditoria
      AuditService.log(
        "course_payment_initiated",
        "course_payment",
        checkoutSession.id,
        userId,
        {
          courseId,
          courseName: course.title,
          amount: item.unit_price,
          originalPrice: course.price,
          discountAmount,
          couponId,
          preferenceId: preference.preferenceId,
        }
      );

      return {
        preferenceId: preference.preferenceId,
        initPoint: preference.initPoint,
        sandboxInitPoint: preference.sandboxInitPoint,
        checkoutId: checkoutSession.id,
      };
    } catch (error) {
      logger.error(
        `Erro ao criar preferência de pagamento para curso: ${error}`,
        error
      );

      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }

      throw new ServiceUnavailableError(
        "Não foi possível processar a solicitação de pagamento no momento",
        "MERCADOPAGO_SERVICE_ERROR",
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Processa um pagamento de curso
   */
  public async processCoursePayment(
    courseId: string,
    userId: string,
    paymentId: string,
    status: MercadoPagoPaymentStatus
  ): Promise<void> {
    try {
      logger.info(
        `Processando pagamento ${paymentId} do curso ${courseId} para usuário ${userId} com status ${status}`
      );

      // Busca a matrícula pendente
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId,
          courseId,
          status: "PENDING_PAYMENT",
        },
        include: {
          course: true,
        },
      });

      if (!enrollment) {
        logger.warn(
          `Matrícula pendente não encontrada: curso ${courseId}, usuário ${userId}`
        );
        return;
      }

      // Se o pagamento foi aprovado, atualiza a matrícula
      if (status === MercadoPagoPaymentStatus.APPROVED) {
        // Conta o número total de aulas do curso
        const totalLessons = await prisma.lesson.count({
          where: {
            module: {
              courseId,
            },
            status: "ACTIVE",
          },
        });

        // Atualiza a matrícula para ativa
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "ACTIVE",
            totalLessons,
            // Atualiza data de expiração a partir da data atual
            expirationDate: new Date(
              Date.now() +
                (enrollment.course.accessPeriod || 365) * 24 * 60 * 60 * 1000
            ),
            // Atualiza data de expiração do suporte, se aplicável
            supportExpiration: enrollment.course.supportPeriod
              ? new Date(
                  Date.now() +
                    enrollment.course.supportPeriod * 24 * 60 * 60 * 1000
                )
              : null,
          },
        });

        logger.info(
          `Matrícula ${enrollment.id} ativada com sucesso para o curso ${courseId}`
        );

        // Registra ação de auditoria
        AuditService.log(
          "course_payment_approved",
          "enrollment",
          enrollment.id,
          userId,
          {
            courseId,
            courseName: enrollment.course.title,
            mpPaymentId: paymentId,
            amount: enrollment.price,
          }
        );
      } else if (
        status === MercadoPagoPaymentStatus.REJECTED ||
        status === MercadoPagoPaymentStatus.CANCELLED
      ) {
        // Se o pagamento foi rejeitado, registra o status
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            // Mantém como pendente para permitir nova tentativa
            // ou poderia ser alterado para um status específico de falha
          },
        });

        logger.info(
          `Pagamento rejeitado/cancelado para matrícula ${enrollment.id} no curso ${courseId}`
        );

        // Registra ação de auditoria
        AuditService.log(
          "course_payment_failed",
          "enrollment",
          enrollment.id,
          userId,
          {
            courseId,
            courseName: enrollment.course.title,
            mpPaymentId: paymentId,
            status,
          }
        );
      }
    } catch (error) {
      logger.error(
        `Erro ao processar pagamento ${paymentId} do curso ${courseId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Verifica se um usuário tem acesso a um curso
   */
  public async checkCourseAccess(
    userId: string,
    courseId: string
  ): Promise<{
    hasAccess: boolean;
    enrollment?: {
      id: string;
      status: string;
      expirationDate: Date;
      progress: number;
    };
  }> {
    try {
      // Busca matrícula ativa
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId,
          courseId,
          status: {
            in: ["ACTIVE", "COMPLETED"],
          },
          // Verifica se não expirou
          expirationDate: {
            gte: new Date(),
          },
        },
      });

      return {
        hasAccess: !!enrollment,
        enrollment: enrollment
          ? {
              id: enrollment.id,
              status: enrollment.status,
              expirationDate: enrollment.expirationDate,
              progress: enrollment.progress,
            }
          : undefined,
      };
    } catch (error) {
      logger.error(
        `Erro ao verificar acesso ao curso ${courseId} para usuário ${userId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Verifica o status de um pagamento de curso
   */
  public async checkPaymentStatus(
    checkoutId: string
  ): Promise<PaymentStatusDto> {
    try {
      // Busca a sessão de checkout
      const checkoutSession = await prisma.checkoutSession.findUnique({
        where: { id: checkoutId },
      });

      if (!checkoutSession) {
        throw new NotFoundError(
          "Sessão de checkout",
          "CHECKOUT_SESSION_NOT_FOUND"
        );
      }

      // Extrai o ID do curso dos metadados
      const metadata = checkoutSession.metadataJson as any;
      const courseId = metadata?.courseId;

      if (!courseId) {
        throw new ValidationError("Sessão de checkout não contém ID do curso");
      }

      // Busca a matrícula
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: checkoutSession.userId || "",
          courseId,
        },
      });

      if (!enrollment) {
        return {
          status: "PENDING",
          courseId,
          paymentId: checkoutSession.mpPreferenceId || "",
        };
      }

      // Se a matrícula está ativa, o pagamento foi concluído
      if (enrollment.status === "ACTIVE" || enrollment.status === "COMPLETED") {
        return {
          status: "COMPLETED",
          courseId,
          paymentId: enrollment.paymentId || "",
          paymentStatus: "APPROVED",
        };
      }

      // Se a matrícula ainda está pendente, verifica o status no MercadoPago
      if (
        enrollment.status === "PENDING_PAYMENT" &&
        checkoutSession.mpPreferenceId
      ) {
        try {
          // Busca o pagamento no MercadoPago (opcional)
          // Esta lógica depende de como você rastreia pagamentos
          // Pode ser omitido se os webhooks forem suficientes

          return {
            status: "PENDING",
            courseId,
            paymentId: checkoutSession.mpPreferenceId,
            paymentStatus: "PENDING",
          };
        } catch (error) {
          logger.warn(
            `Erro ao verificar status do pagamento ${checkoutSession.mpPreferenceId}`,
            error
          );
        }
      }

      return {
        status: enrollment.status,
        courseId,
        paymentId: enrollment.paymentId || "",
      };
    } catch (error) {
      logger.error(
        `Erro ao verificar status do pagamento ${checkoutId}`,
        error
      );

      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }

      throw new ServiceUnavailableError(
        "Não foi possível verificar o status do pagamento",
        "PAYMENT_CHECK_ERROR",
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }
}

// Exporta instância única para uso em toda a aplicação
export const coursePaymentService = new CoursePaymentService();
