import { MercadoPagoPaymentStatus } from "../../dto/payment.dto";
import { PaymentResponseDto, PaymentStatusDto } from "../../dto/payment.dto";

/**
 * Interface para operações de pagamento de cursos
 */
export interface ICoursePaymentService {
  /**
   * Cria preferência de pagamento para compra de curso
   *
   * @param courseId ID do curso
   * @param userId ID do usuário
   * @param paymentMethodId ID do método de pagamento
   * @param couponId ID do cupom de desconto (opcional)
   * @param installments Número de parcelas (opcional)
   */
  createCoursePayment(
    courseId: string,
    userId: string,
    paymentMethodId: string,
    couponId?: string,
    installments?: number
  ): Promise<PaymentResponseDto>;

  /**
   * Processa um pagamento de curso
   *
   * @param courseId ID do curso
   * @param userId ID do usuário
   * @param paymentId ID do pagamento
   * @param status Status do pagamento
   */
  processCoursePayment(
    courseId: string,
    userId: string,
    paymentId: string,
    status: MercadoPagoPaymentStatus
  ): Promise<void>;

  /**
   * Verifica se um usuário tem acesso a um curso
   *
   * @param userId ID do usuário
   * @param courseId ID do curso
   */
  checkCourseAccess(
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
  }>;

  /**
   * Verifica o status de um pagamento de curso
   *
   * @param checkoutId ID da sessão de checkout
   */
  checkPaymentStatus(checkoutId: string): Promise<PaymentStatusDto>;
}
