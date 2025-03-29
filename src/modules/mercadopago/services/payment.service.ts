/**
 * Serviço para processamento de pagamentos via MercadoPago
 * @module modules/mercadopago/services/payment.service
 */

import { Payment, PaymentCreateData, PaymentRefundData } from "mercadopago";
import { MercadoPagoBaseService } from "./base.service";
import { MercadoPagoIntegrationType } from "../config/credentials";
import { logger } from "@/shared/utils/logger.utils";
import { AuditService, AuditAction } from "@/shared/services/audit.service";

/**
 * Serviço para processamento de pagamentos
 */
export class PaymentService extends MercadoPagoBaseService {
  private paymentClient: Payment;

  /**
   * Construtor do serviço de pagamento
   * @param integrationType Tipo de integração (subscription ou checkout)
   */
  constructor(
    integrationType: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ) {
    super(integrationType);
    this.paymentClient = this.createPaymentClient();
    logger.debug("Serviço de pagamento do MercadoPago inicializado");
  }

  /**
   * Cria um pagamento
   * @param paymentData Dados do pagamento
   * @param userId ID do usuário para auditoria
   * @returns Resultado da criação do pagamento
   */
  public async createPayment(
    paymentData: PaymentCreateData,
    userId?: string
  ): Promise<any> {
    try {
      logger.info("Iniciando criação de pagamento no MercadoPago", {
        externalReference: paymentData.external_reference,
        integrationType: this.integrationType,
      });

      const result = await this.paymentClient.create({ body: paymentData });

      // Registra a operação para auditoria
      AuditService.log(
        AuditAction.CREATE,
        "payment",
        result.id.toString(),
        userId,
        {
          amount: paymentData.transaction_amount,
          paymentMethodId: paymentData.payment_method_id,
          integrationType: this.integrationType,
          status: result.status,
        }
      );

      logger.info("Pagamento criado com sucesso no MercadoPago", {
        paymentId: result.id,
        status: result.status,
        integrationType: this.integrationType,
      });

      return result;
    } catch (error) {
      this.handleError(error, "createPayment");
    }
  }

  /**
   * Obtém informações de um pagamento por ID
   * @param paymentId ID do pagamento
   * @returns Detalhes do pagamento
   */
  public async getPayment(paymentId: string | number): Promise<any> {
    try {
      logger.debug(`Obtendo informações do pagamento ${paymentId}`, {
        integrationType: this.integrationType,
      });

      const result = await this.paymentClient.get({ id: paymentId });

      return result;
    } catch (error) {
      this.handleError(error, "getPayment");
    }
  }

  /**
   * Realiza a devolução total ou parcial de um pagamento
   * @param paymentId ID do pagamento
   * @param amount Valor a ser devolvido (opcional, para devolução parcial)
   * @param userId ID do usuário para auditoria
   * @returns Resultado da devolução
   */
  public async refundPayment(
    paymentId: string | number,
    amount?: number,
    userId?: string
  ): Promise<any> {
    try {
      const refundData: PaymentRefundData = {};

      // Se o valor for fornecido, é uma devolução parcial
      if (amount) {
        refundData.amount = amount;
      }

      logger.info(`Iniciando devolução de pagamento ${paymentId}`, {
        amount: amount ? amount : "total",
        integrationType: this.integrationType,
      });

      const result = await this.paymentClient.refund({
        id: paymentId,
        body: refundData,
      });

      // Registra a operação para auditoria
      AuditService.log(
        "payment_refund",
        "payment",
        paymentId.toString(),
        userId,
        {
          amount: amount || "total",
          integrationType: this.integrationType,
          refundId: result.id,
        }
      );

      logger.info(`Devolução de pagamento realizada com sucesso`, {
        paymentId,
        refundId: result.id,
        integrationType: this.integrationType,
      });

      return result;
    } catch (error) {
      this.handleError(error, "refundPayment");
    }
  }

  /**
   * Captura um pagamento previamente autorizado
   * @param paymentId ID do pagamento
   * @param userId ID do usuário para auditoria
   * @returns Resultado da captura
   */
  public async capturePayment(
    paymentId: string | number,
    userId?: string
  ): Promise<any> {
    try {
      logger.info(`Iniciando captura de pagamento ${paymentId}`, {
        integrationType: this.integrationType,
      });

      const result = await this.paymentClient.capture({ id: paymentId });

      // Registra a operação para auditoria
      AuditService.log(
        "payment_capture",
        "payment",
        paymentId.toString(),
        userId,
        {
          integrationType: this.integrationType,
          status: result.status,
        }
      );

      logger.info(`Captura de pagamento realizada com sucesso`, {
        paymentId,
        status: result.status,
        integrationType: this.integrationType,
      });

      return result;
    } catch (error) {
      this.handleError(error, "capturePayment");
    }
  }

  /**
   * Pesquisa pagamentos por critérios
   * @param criteria Critérios de pesquisa
   * @returns Lista de pagamentos
   */
  public async searchPayments(criteria: any): Promise<any> {
    try {
      logger.debug("Pesquisando pagamentos no MercadoPago", {
        criteria,
        integrationType: this.integrationType,
      });

      const result = await this.paymentClient.search({ qs: criteria });

      return result;
    } catch (error) {
      this.handleError(error, "searchPayments");
    }
  }
}

// Exporta a instância default para o tipo checkout
export const paymentService = new PaymentService(
  MercadoPagoIntegrationType.CHECKOUT
);
