// src/modules/mercadopago/services/payment.service.ts

import { logger } from "@/shared/utils/logger.utils";
import { mercadoPagoService } from "./mercadopago.service";
import { mercadoPagoConfig } from "../config/mercadopago.config";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { AuditService } from "@/shared/services/audit.service";
import {
  CreatePaymentRequest,
  CreatePaymentResponse,
  GetPaymentInfoRequest,
  CapturePaymentRequest,
  CancelPaymentRequest,
} from "../dto/mercadopago.dto";

/**
 * Serviço para gerenciar pagamentos únicos no Mercado Pago
 */
export class PaymentService {
  private static instance: PaymentService;

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {}

  /**
   * Obtém a instância única do serviço
   */
  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Cria um novo pagamento
   * @param paymentData Dados para criação do pagamento
   * @returns Informações sobre o pagamento criado
   */
  public async createPayment(
    paymentData: CreatePaymentRequest
  ): Promise<CreatePaymentResponse> {
    try {
      // Validações básicas
      if (!paymentData.transactionAmount) {
        throw new ServiceUnavailableError(
          "Valor da transação é obrigatório",
          "PAYMENT_AMOUNT_REQUIRED"
        );
      }

      if (!paymentData.description) {
        throw new ServiceUnavailableError(
          "Descrição do pagamento é obrigatória",
          "PAYMENT_DESCRIPTION_REQUIRED"
        );
      }

      if (!paymentData.payer || !paymentData.payer.email) {
        throw new ServiceUnavailableError(
          "Email do pagador é obrigatório",
          "PAYMENT_PAYER_EMAIL_REQUIRED"
        );
      }

      // Obtém a API de pagamentos
      const payment = mercadoPagoService.getPaymentAPI();

      // Formata os dados para o formato esperado pelo Mercado Pago
      const paymentBody = {
        transaction_amount: paymentData.transactionAmount,
        description: paymentData.description,
        payment_method_id: paymentData.paymentMethodId,
        payer: {
          email: paymentData.payer.email,
          first_name: paymentData.payer.firstName,
          last_name: paymentData.payer.lastName,
          identification: paymentData.payer.identification,
          phone: paymentData.payer.phone,
          address: paymentData.payer.address,
        },
        metadata: {
          ...paymentData.metadata,
          userId: paymentData.userId,
        },
      };

      // Adiciona campos opcionais somente se existirem
      if (paymentData.installments) {
        paymentBody.installments = paymentData.installments;
      }

      if (paymentData.token) {
        paymentBody.token = paymentData.token;
      }

      if (paymentData.externalReference) {
        paymentBody.external_reference = paymentData.externalReference;
      }

      // Cria opções de requisição (para idempotência)
      const requestOptions = {
        idempotencyKey: `payment-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 10)}`,
      };

      // Envia a requisição para criar o pagamento
      const result = await payment.create({
        body: paymentBody,
        requestOptions,
      });

      // Verifica se o resultado é válido
      if (!result || !result.id) {
        throw new Error("Resposta inválida do Mercado Pago");
      }

      // Registra o pagamento no log de auditoria
      AuditService.log(
        "payment_created",
        "payment",
        String(result.id),
        paymentData.userId,
        {
          amount: paymentData.transactionAmount,
          status: result.status,
          paymentMethodId: paymentData.paymentMethodId,
        }
      );

      logger.info(`Pagamento criado com sucesso: ${result.id}`, {
        paymentId: result.id,
        status: result.status,
        amount: paymentData.transactionAmount,
      });

      return {
        success: true,
        paymentId: String(result.id),
        status: result.status,
        statusDetail: result.status_detail,
        data: result,
      };
    } catch (error) {
      // Trata e formata o erro
      const formattedError = mercadoPagoService.formatError(
        error,
        "create_payment"
      );

      logger.error(`Erro ao criar pagamento:`, formattedError);

      return {
        success: false,
        error: formattedError.message,
        errorCode: formattedError.code,
      };
    }
  }

  /**
   * Obtém informações de um pagamento existente
   * @param request Dados para consulta do pagamento
   * @returns Informações detalhadas do pagamento
   */
  public async getPaymentInfo(
    request: GetPaymentInfoRequest
  ): Promise<CreatePaymentResponse> {
    try {
      if (!request.paymentId) {
        throw new ServiceUnavailableError(
          "ID do pagamento é obrigatório",
          "PAYMENT_ID_REQUIRED"
        );
      }

      // Obtém a API de pagamentos
      const payment = mercadoPagoService.getPaymentAPI();

      // Consulta o pagamento
      const result = await payment.get({ id: request.paymentId });

      if (!result || !result.id) {
        throw new Error("Pagamento não encontrado");
      }

      logger.info(
        `Informações do pagamento ${request.paymentId} obtidas com sucesso`
      );

      return {
        success: true,
        paymentId: String(result.id),
        status: result.status,
        statusDetail: result.status_detail,
        data: result,
      };
    } catch (error) {
      // Trata e formata o erro
      const formattedError = mercadoPagoService.formatError(
        error,
        "get_payment"
      );

      logger.error(`Erro ao obter informações do pagamento:`, formattedError);

      return {
        success: false,
        error: formattedError.message,
        errorCode: formattedError.code,
      };
    }
  }

  /**
   * Captura um pagamento que está em status pendente
   * Útil para pagamentos com cartão que foram apenas autorizados
   * @param request Dados para captura do pagamento
   * @returns Informações atualizadas do pagamento
   */
  public async capturePayment(
    request: CapturePaymentRequest
  ): Promise<CreatePaymentResponse> {
    try {
      if (!request.paymentId) {
        throw new ServiceUnavailableError(
          "ID do pagamento é obrigatório",
          "PAYMENT_ID_REQUIRED"
        );
      }

      // Obtém a API de pagamentos
      const payment = mercadoPagoService.getPaymentAPI();

      // Prepara os dados para captura
      const captureData = {
        capture: true,
      };

      // Se um valor específico foi fornecido
      if (request.amount) {
        captureData.transaction_amount = request.amount;
      }

      // Realiza a captura
      const result = await payment.update({
        id: request.paymentId,
        body: captureData,
      });

      if (!result || !result.id) {
        throw new Error("Falha ao capturar pagamento");
      }

      logger.info(`Pagamento ${request.paymentId} capturado com sucesso`);

      return {
        success: true,
        paymentId: String(result.id),
        status: result.status,
        statusDetail: result.status_detail,
        data: result,
      };
    } catch (error) {
      // Trata e formata o erro
      const formattedError = mercadoPagoService.formatError(
        error,
        "capture_payment"
      );

      logger.error(`Erro ao capturar pagamento:`, formattedError);

      return {
        success: false,
        error: formattedError.message,
        errorCode: formattedError.code,
      };
    }
  }

  /**
   * Cancela um pagamento
   * @param request Dados para cancelamento do pagamento
   * @returns Informações atualizadas do pagamento
   */
  public async cancelPayment(
    request: CancelPaymentRequest
  ): Promise<CreatePaymentResponse> {
    try {
      if (!request.paymentId) {
        throw new ServiceUnavailableError(
          "ID do pagamento é obrigatório",
          "PAYMENT_ID_REQUIRED"
        );
      }

      // Obtém a API de pagamentos
      const payment = mercadoPagoService.getPaymentAPI();

      // Realiza o cancelamento
      const result = await payment.update({
        id: request.paymentId,
        body: {
          status: "cancelled",
        },
      });

      if (!result || !result.id) {
        throw new Error("Falha ao cancelar pagamento");
      }

      logger.info(`Pagamento ${request.paymentId} cancelado com sucesso`);

      return {
        success: true,
        paymentId: String(result.id),
        status: result.status,
        statusDetail: result.status_detail,
        data: result,
      };
    } catch (error) {
      // Trata e formata o erro
      const formattedError = mercadoPagoService.formatError(
        error,
        "cancel_payment"
      );

      logger.error(`Erro ao cancelar pagamento:`, formattedError);

      return {
        success: false,
        error: formattedError.message,
        errorCode: formattedError.code,
      };
    }
  }

  /**
   * Processa uma notificação de pagamento recebida por webhook
   * @param paymentId ID do pagamento
   * @param topic Tópico da notificação
   * @returns Informações atualizadas do pagamento
   */
  public async processPaymentWebhook(
    paymentId: string,
    topic: string
  ): Promise<CreatePaymentResponse> {
    try {
      logger.info(`Processando webhook de pagamento: ${topic} - ${paymentId}`);

      // Apenas busca as informações atualizadas do pagamento
      return await this.getPaymentInfo({ paymentId });
    } catch (error) {
      // Trata e formata o erro
      const formattedError = mercadoPagoService.formatError(
        error,
        "process_webhook"
      );

      logger.error(`Erro ao processar webhook de pagamento:`, formattedError);

      return {
        success: false,
        error: formattedError.message,
        errorCode: formattedError.code,
      };
    }
  }
}

// Exporta uma instância do serviço
export const paymentService = PaymentService.getInstance();
