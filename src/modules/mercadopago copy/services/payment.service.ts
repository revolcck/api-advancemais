/**
 * Serviço para processamento de pagamentos via MercadoPago
 * @module modules/mercadopago/services/payment.service
 */

import { Payment } from "mercadopago";
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
import { mercadoPagoNotificationService } from "./notification.service";
import { formatCurrency } from "@/shared/utils/format.utils";

interface PaymentCreateData {
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  installments?: number;
  token?: string;
  external_reference?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface para dados de reembolso no MercadoPago
 */
interface PaymentRefundData {
  amount?: number;
}

/**
 * Interface para resposta da API de pagamentos do MercadoPago
 */
interface PaymentResponse {
  id?: string | number;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  [key: string]: any;
}

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
      const result: PaymentResponse = await this.paymentClient.create({
        body: mercadoPagoData,
      });

      // Registra a operação para auditoria
      if (result && result.id) {
        AuditService.log(
          "payment_created",
          "payment",
          result.id.toString(),
          userId,
          {
            amount: paymentData.transactionAmount,
            paymentMethodId: paymentData.paymentMethodId,
            integrationType: this.integrationType,
            status: result.status || "unknown",
          }
        );

        logger.info("Pagamento criado com sucesso no MercadoPago", {
          paymentId: result.id,
          status: result.status,
          integrationType: this.integrationType,
        });

        // Enviar email de confirmação de compra se o pagamento for aprovado
        if (result.status === "approved") {
          try {
            await mercadoPagoNotificationService.sendPurchaseConfirmation({
              id: result.id.toString(),
              customerName: `${mpPaymentData.payer.firstName || ""} ${
                mpPaymentData.payer.lastName || ""
              }`.trim(),
              customerEmail: mpPaymentData.payer.email,
              productName: mpPaymentData.description,
              amount: mpPaymentData.transactionAmount,
              date: new Date(),
              paymentMethod: this.formatPaymentMethodName(
                mpPaymentData.paymentMethodId
              ),
              reference: mpPaymentData.externalReference,
              status: result.status,
            });

            logger.info(
              `Email de confirmação de compra enviado para ${mpPaymentData.payer.email}`,
              {
                paymentId: result.id,
              }
            );
          } catch (emailError) {
            logger.error("Erro ao enviar email de confirmação de compra", {
              error: emailError,
              paymentId: result.id,
              email: mpPaymentData.payer.email,
            });
            // Não interrompe o fluxo em caso de erro no envio de email
          }
        }

        // Formata a resposta da operação
        return {
          success: true,
          paymentId: result.id.toString(),
          status: result.status,
          statusDetail: result.status_detail,
          data: result,
        };
      } else {
        throw new Error("Resposta do MercadoPago não contém ID do pagamento");
      }
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
  public async getPayment(
    paymentId: string | number
  ): Promise<MercadoPagoBaseResponse> {
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

      // Primeiro, obter os detalhes do pagamento para ter informações para o email
      const paymentDetails = await this.getPayment(paymentId);
      if (!paymentDetails.success) {
        throw new Error(
          `Não foi possível obter detalhes do pagamento: ${paymentDetails.error}`
        );
      }

      // Usando o serviço de reembolso do MercadoPago
      const paymentRefund = this.mercadoPagoService.getPaymentRefundAPI();
      const result = await paymentRefund.create({
        payment_id: paymentId,
        amount: refundData.amount,
      });

      // Buscar informações do pedido e cliente para enviar email
      try {
        const externalReference = paymentDetails.data.external_reference;
        if (externalReference) {
          const prisma = require("@/shared/database/prisma").prismaClient;
          const order = await prisma.order.findUnique({
            where: {
              externalReference,
            },
            include: {
              items: true,
              customer: true,
            },
          });

          if (order && order.customer && order.customer.email) {
            // Enviar email de notificação de estorno
            await mercadoPagoNotificationService.sendRefundNotification({
              id: paymentId.toString(),
              customerName: `${order.customer.firstName || ""} ${
                order.customer.lastName || ""
              }`.trim(),
              customerEmail: order.customer.email,
              productName:
                order.items.length === 1
                  ? order.items[0].name
                  : `Pedido #${order.orderNumber || order.id}`,
              amount: amount || paymentDetails.data.transaction_amount,
              date: new Date(),
              reference: order.orderNumber || order.id,
              status: "refunded",
            });

            logger.info(
              `Notificação de estorno enviada para ${order.customer.email}`,
              {
                orderId: order.id,
                paymentId: paymentId.toString(),
                refundId: result.id,
              }
            );
          }
        }
      } catch (emailError) {
        // Log do erro, mas não interrompe o processamento
        logger.error(`Erro ao enviar notificação de estorno por email`, {
          error: emailError,
          paymentId: paymentId.toString(),
          refundId: result.id,
        });
      }

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

      // Operação PUT para capturar um pagamento
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

      const result = await this.paymentClient.search({
        options: criteria,
      });

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

      // Implementação real da lógica de processamento de webhooks
      try {
        // 1. Buscar o pedido relacionado ao pagamento usando external_reference
        const externalReference = paymentDetails.data.external_reference;
        if (!externalReference) {
          logger.warn(`Pagamento ${paymentId} sem referência externa`, {
            paymentStatus: paymentDetails.data.status,
          });
          return {
            success: false,
            error: "Pagamento sem referência externa",
            errorCode: "WEBHOOK_MISSING_REFERENCE",
          };
        }

        // Buscar o pedido no banco de dados usando uma instância do PrismaClient
        const prisma = require("@/shared/database/prisma").prismaClient;
        const order = await prisma.order.findUnique({
          where: {
            externalReference,
          },
          include: {
            items: true,
            customer: true,
          },
        });

        if (!order) {
          logger.warn(
            `Pedido não encontrado para referência: ${externalReference}`,
            {
              paymentId,
              paymentStatus: paymentDetails.data.status,
            }
          );
          return {
            success: false,
            error: `Pedido não encontrado para referência: ${externalReference}`,
            errorCode: "WEBHOOK_ORDER_NOT_FOUND",
          };
        }

        // 2. Atualizar o status do pedido com base no status do pagamento
        const paymentStatus = paymentDetails.data.status;
        let orderStatus;

        switch (paymentStatus) {
          case "approved":
            orderStatus = "PAID";
            break;
          case "pending":
            orderStatus = "PENDING_PAYMENT";
            break;
          case "in_process":
            orderStatus = "PROCESSING_PAYMENT";
            break;
          case "rejected":
            orderStatus = "PAYMENT_FAILED";
            break;
          case "refunded":
            orderStatus = "REFUNDED";
            break;
          case "cancelled":
            orderStatus = "CANCELLED";
            break;
          default:
            orderStatus = "PAYMENT_REVIEW";
        }

        // Atualizar o pedido
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: orderStatus,
            paymentStatus: paymentStatus,
            lastPaymentUpdate: new Date(),
            paymentData: {
              // Armazena detalhes adicionais como JSON
              paymentId,
              statusDetail: paymentDetails.data.status_detail,
              paymentMethod: paymentDetails.data.payment_method_id,
              paymentType: paymentDetails.data.payment_type_id,
              lastUpdated: new Date().toISOString(),
            },
          },
        });

        // 3. Enviar notificações para o cliente sobre o status da transação
        if (order.customer && order.customer.email) {
          try {
            // Determina qual tipo de notificação enviar com base no status
            if (paymentStatus === "approved") {
              // Notificação de compra confirmada
              await mercadoPagoNotificationService.sendPurchaseConfirmation({
                id: paymentId,
                customerName: `${order.customer.firstName || ""} ${
                  order.customer.lastName || ""
                }`.trim(),
                customerEmail: order.customer.email,
                productName:
                  order.items.length === 1
                    ? order.items[0].name
                    : `Pedido #${order.orderNumber || order.id}`,
                amount: paymentDetails.data.transaction_amount,
                date: new Date(),
                paymentMethod: this.formatPaymentMethodName(
                  paymentDetails.data.payment_method_id,
                  paymentDetails.data.payment_type_id
                ),
                reference: order.orderNumber || order.id,
                status: paymentStatus,
              });

              logger.info(
                `Notificação de compra enviada para ${order.customer.email}`,
                {
                  orderId: order.id,
                  status: orderStatus,
                }
              );
            } else if (paymentStatus === "refunded") {
              // Notificação de estorno
              await mercadoPagoNotificationService.sendRefundNotification({
                id: paymentId,
                customerName: `${order.customer.firstName || ""} ${
                  order.customer.lastName || ""
                }`.trim(),
                customerEmail: order.customer.email,
                productName:
                  order.items.length === 1
                    ? order.items[0].name
                    : `Pedido #${order.orderNumber || order.id}`,
                amount: paymentDetails.data.transaction_amount,
                date: new Date(),
                reference: order.orderNumber || order.id,
                status: paymentStatus,
              });

              logger.info(
                `Notificação de estorno enviada para ${order.customer.email}`,
                {
                  orderId: order.id,
                  status: orderStatus,
                }
              );
            }
          } catch (notifyError) {
            // Log do erro, mas não interrompe o processamento
            logger.error(`Erro ao enviar notificação de pagamento`, {
              error: notifyError,
              orderId: order.id,
              customerEmail: order.customer.email,
            });
          }
        }

        // 4. Atualizar estoque se necessário (apenas para pagamentos aprovados)
        if (paymentStatus === "approved" && order.items?.length > 0) {
          try {
            const inventoryService =
              require("@/modules/inventory/services/inventory.service").inventoryService;

            // Atualiza o estoque para cada item
            for (const item of order.items) {
              await inventoryService.decreaseStock({
                productId: item.productId,
                quantity: item.quantity,
                orderId: order.id,
                reason: "ORDER_PAID",
              });
            }

            logger.info(`Estoque atualizado para o pedido ${order.id}`, {
              itemCount: order.items.length,
            });
          } catch (inventoryError) {
            // Log do erro, mas não interrompe o processamento
            logger.error(`Erro ao atualizar estoque`, {
              error: inventoryError,
              orderId: order.id,
            });
          }
        }

        // 5. Registrar o evento em logs de auditoria
        AuditService.log(
          "payment_status_update",
          "order",
          order.id,
          order.userId || "webhook",
          {
            previousStatus: order.status,
            newStatus: orderStatus,
            paymentId,
            paymentStatus,
            paymentDetail: paymentDetails.data.status_detail,
          }
        );

        logger.info(`Processamento de webhook concluído com sucesso`, {
          orderId: order.id,
          paymentId,
          previousStatus: order.status,
          newStatus: orderStatus,
        });

        return {
          success: true,
          data: {
            orderId: order.id,
            orderStatus,
            paymentStatus,
            updated: true,
          },
        };
      } catch (processingError) {
        logger.error(`Erro ao processar lógica de negócios do webhook`, {
          error: processingError,
          paymentId,
          paymentStatus: paymentDetails.data.status,
        });

        // Trata o processingError de forma segura, verificando seu tipo
        const errorMessage =
          processingError instanceof Error
            ? processingError.message
            : "Erro desconhecido";

        return {
          success: false,
          error: `Erro ao processar webhook: ${errorMessage}`,
          errorCode: "WEBHOOK_PROCESSING_ERROR",
          data: paymentDetails.data,
        };
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      return this.formatErrorResponse(error, "processPaymentWebhook");
    }
  }

  /**
   * Formata o nome do método de pagamento para exibição
   * @param paymentMethodId ID do método de pagamento
   * @param paymentTypeId Tipo de pagamento
   * @returns Nome formatado do método de pagamento
   */
  private formatPaymentMethodName(
    paymentMethodId?: string,
    paymentTypeId?: string
  ): string {
    if (paymentTypeId === "credit_card") {
      // Mapeamento de bandeiras de cartão
      const cardBrands: Record<string, string> = {
        visa: "Visa",
        master: "Mastercard",
        amex: "American Express",
        elo: "Elo",
        hipercard: "Hipercard",
        diners: "Diners Club",
      };

      return cardBrands[paymentMethodId || ""] || "Cartão de Crédito";
    }

    if (paymentTypeId === "debit_card") {
      return "Cartão de Débito";
    }

    // Mapeamento de outros métodos de pagamento
    const paymentMethods: Record<string, string> = {
      pix: "PIX",
      bolbradesco: "Boleto Bancário",
      pec: "Pagamento em Lotérica",
      account_money: "Saldo MercadoPago",
      bank_transfer: "Transferência Bancária",
    };

    return paymentMethods[paymentMethodId || ""] || "Outro método de pagamento";
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

  /**
   * Referência para o serviço do Mercado Pago
   * Necessário para acessar APIs específicas
   */
  private get mercadoPagoService() {
    return require("./mercadopago.service").mercadoPagoService;
  }
}

export const paymentService = new PaymentService(
  MercadoPagoIntegrationType.CHECKOUT
);
