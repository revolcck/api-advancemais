/**
 * Serviço para processamento de pagamentos via MercadoPago
 * @module modules/mercadopago/services/payment.service
 */

import { Payment, PaymentCreateData, PaymentRefundData } from "mercadopago";
import { MercadoPagoBaseService } from "./base.service";
import { MercadoPagoIntegrationType } from "../config/credentials";
import { logger } from "@/shared/utils/logger.utils";
import { AuditService } from "@/shared/services/audit.service";
import { IPaymentService } from "../interfaces";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import {
  CreatePaymentRequest,
  CreatePaymentResponse,
  MercadoPagoBaseResponse,
} from "../dtos/mercadopago.dto";

/**
 * Serviço para processamento de pagamentos via MercadoPago
 * Implementa a interface IPaymentService
 */
export class PaymentService
  extends MercadoPagoBaseService
  implements IPaymentService
{
  private paymentClient: Payment;

  /**
   * Construtor do serviço de pagamento
   * @param integrationType Tipo de integração (default: CHECKOUT)
   */
  constructor(
    integrationType: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ) {
    super(integrationType);
    this.paymentClient = this.createPaymentClient();
    logger.debug("Serviço de pagamento do MercadoPago inicializado");
  }

  /**
   * Cria um pagamento no MercadoPago
   * @param paymentData Dados do pagamento
   * @param userId ID do usuário para auditoria
   * @returns Resultado da criação do pagamento
   */
  public async createPayment(
    paymentData: CreatePaymentRequest
  ): Promise<CreatePaymentResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de pagamento do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      const userId = paymentData.userId;

      // Remove campos específicos da nossa API que não são para o MercadoPago
      const { userId: _, ...mpPaymentData } = paymentData;

      // Prepara os dados para a API do MercadoPago
      const mercadoPagoData: PaymentCreateData = {
        transaction_amount: mpPaymentData.transactionAmount,
        description: mpPaymentData.description,
        payment_method_id: mpPaymentData.paymentMethodId,
        payer: {
          email: mpPaymentData.payer.email,
          first_name: mpPaymentData.payer.firstName,
          last_name: mpPaymentData.payer.lastName,
          identification: mpPaymentData.payer.identification,
        },
        installments: mpPaymentData.installments || 1,
        token: mpPaymentData.token,
        external_reference: mpPaymentData.externalReference,
        callback_url: mpPaymentData.callbackUrl,
        metadata: mpPaymentData.metadata,
      };

      logger.info("Iniciando criação de pagamento no MercadoPago", {
        externalReference: mercadoPagoData.external_reference,
        integrationType: this.integrationType,
      });

      // Chama a API do MercadoPago
      const result = await this.paymentClient.create({ body: mercadoPagoData });

      // Registra a operação para auditoria
      AuditService.log(
        "payment_created",
        "payment",
        result.id.toString(),
        userId,
        {
          amount: paymentData.transactionAmount,
          paymentMethodId: paymentData.paymentMethodId,
          integrationType: this.integrationType,
          status: result.status,
        }
      );

      logger.info("Pagamento criado com sucesso no MercadoPago", {
        paymentId: result.id,
        status: result.status,
        integrationType: this.integrationType,
      });

      // Formata a resposta da operação
      return {
        success: true,
        paymentId: result.id.toString(),
        status: result.status,
        statusDetail: result.status_detail,
        data: result,
      };
    } catch (error) {
      // Se já for um ServiceUnavailableError, apenas propaga
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      // Se for outro tipo de erro, formata para resposta
      const { message, code } = this.formatErrorResponse(
        error,
        "createPayment"
      );

      return {
        success: false,
        error: message,
        errorCode: code,
      };
    }
  }

  /**
   * Obtém informações de um pagamento por ID
   * @param paymentId ID do pagamento
   * @returns Detalhes do pagamento
   */
  public async getPayment(paymentId: string | number): Promise<any> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de pagamento do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      logger.debug(`Obtendo informações do pagamento ${paymentId}`, {
        integrationType: this.integrationType,
      });

      const result = await this.paymentClient.get({ id: paymentId });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      return this.formatErrorResponse(error, "getPayment");
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
  ): Promise<MercadoPagoBaseResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de pagamento do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

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

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      return this.formatErrorResponse(error, "refundPayment");
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
  ): Promise<MercadoPagoBaseResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de pagamento do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

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

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      return this.formatErrorResponse(error, "capturePayment");
    }
  }

  /**
   * Pesquisa pagamentos por critérios
   * @param criteria Critérios de pesquisa
   * @returns Lista de pagamentos
   */
  public async searchPayments(criteria: any): Promise<MercadoPagoBaseResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de pagamento do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      logger.debug("Pesquisando pagamentos no MercadoPago", {
        criteria,
        integrationType: this.integrationType,
      });

      const result = await this.paymentClient.search({ qs: criteria });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      return this.formatErrorResponse(error, "searchPayments");
    }
  }

  /**
   * Processa webhook de pagamento
   * @param paymentId ID do pagamento
   * @param type Tipo de notificação
   * @returns Resultado do processamento
   */
  public async processPaymentWebhook(
    paymentId: string,
    type: string
  ): Promise<MercadoPagoBaseResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de pagamento do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      logger.info(`Processando webhook de pagamento ID: ${paymentId}`, {
        type,
        integrationType: this.integrationType,
      });

      // Obtém os detalhes do pagamento
      const paymentDetails = await this.getPayment(paymentId);

      if (!paymentDetails.success) {
        return paymentDetails;
      }

      // Aqui você adicionaria a lógica para atualizar seu sistema com os novos dados
      // Por exemplo, atualizar o status do pedido na sua base de dados

      logger.info(`Webhook de pagamento processado com sucesso`, {
        paymentId,
        status: paymentDetails.data.status,
        type,
        integrationType: this.integrationType,
      });

      return {
        success: true,
        data: paymentDetails.data,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      return this.formatErrorResponse(error, "processPaymentWebhook");
    }
  }

  /**
   * Formata um erro do MercadoPago para resposta da API
   * @param error Erro original
   * @param operation Nome da operação
   * @returns Resposta de erro formatada
   */
  private formatErrorResponse(
    error: any,
    operation: string
  ): MercadoPagoBaseResponse & { message: string; code: string } {
    const errorResponse: any = {
      success: false,
    };

    // Tenta extrair detalhes do erro
    if (error && error.cause && Array.isArray(error.cause)) {
      // Formato específico de erro da API do MercadoPago
      const causes = error.cause
        .map((c: any) => c.description || c.message || JSON.stringify(c))
        .join(", ");

      errorResponse.error = `Erro na operação ${operation} do MercadoPago: ${causes}`;
      errorResponse.errorCode = `MERCADOPAGO_${operation.toUpperCase()}_ERROR`;
      errorResponse.message = errorResponse.error;
      errorResponse.code = errorResponse.errorCode;
    } else if (error && error.response && error.response.data) {
      // Erro HTTP com resposta estruturada
      const errorData = error.response.data;
      errorResponse.error =
        errorData.message || `Erro na operação ${operation} do MercadoPago`;
      errorResponse.errorCode =
        errorData.code || `MERCADOPAGO_${operation.toUpperCase()}_ERROR`;
      errorResponse.message = errorResponse.error;
      errorResponse.code = errorResponse.errorCode;
    } else {
      // Erro genérico
      errorResponse.error =
        error instanceof Error
          ? error.message
          : `Erro na operação ${operation} do MercadoPago`;
      errorResponse.errorCode = `MERCADOPAGO_${operation.toUpperCase()}_ERROR`;
      errorResponse.message = errorResponse.error;
      errorResponse.code = errorResponse.errorCode;
    }

    // Registra o erro
    logger.error(errorResponse.error, {
      operation,
      integrationType: this.integrationType,
      error,
    });

    return errorResponse;
  }
}

export const paymentService = new PaymentService(
  MercadoPagoIntegrationType.CHECKOUT
);
