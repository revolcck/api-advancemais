import { Request, Response } from "express";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { logger } from "@/shared/utils/logger.utils";
import { mercadoPagoService } from "../services/mercadopago.service";
import { mercadoPagoConfig } from "../config/mercadopago.config";
import { paymentService } from "../services/payment.service";
import { subscriptionService } from "../services/subscription.service";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import {
  CreatePaymentRequest,
  CreateSubscriptionRequest,
  WebhookNotificationRequest,
} from "../dtos/mercadopago.dto";

export class MercadoPagoController {
  /**
   * Testa a conectividade com a API do Mercado Pago
   * @route GET /api/mercadopago/test-connectivity
   */
  public testConnectivity = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const result = await mercadoPagoService.testConnectivity();

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error || "Falha na conectividade com a API do Mercado Pago",
          result.errorCode || "MERCADOPAGO_CONNECTIVITY_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: "Conexão com a API do Mercado Pago estabelecida com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao verificar conectividade com o Mercado Pago";

        ApiResponse.error(res, message, {
          code: "MERCADOPAGO_CONNECTIVITY_FAILED",
          statusCode: 503,
        });
      }
    }
  };

  /**
   * Obtém a chave pública para uso no frontend
   * @route GET /api/mercadopago/public-key
   */
  public getPublicKey = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!mercadoPagoConfig.isAvailable()) {
        throw new ServiceUnavailableError(
          "Serviço do Mercado Pago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      const publicKey = mercadoPagoConfig.getPublicKey();
      const isTestMode = mercadoPagoConfig.isTestMode();

      ApiResponse.success(
        res,
        {
          publicKey,
          isTestMode,
        },
        {
          message: "Chave pública do Mercado Pago obtida com sucesso",
          statusCode: 200,
        }
      );
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao obter chave pública do Mercado Pago";

        ApiResponse.error(res, message, {
          code: "MERCADOPAGO_PUBLIC_KEY_ERROR",
          statusCode: 500,
        });
      }
    }
  };

  /**
   * Cria um novo pagamento
   * @route POST /api/mercadopago/payments
   */
  public createPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      // Obtém os dados da requisição e adiciona o ID do usuário para auditoria
      const paymentData: CreatePaymentRequest = {
        ...req.body,
        userId: req.user?.id,
      };

      const result = await paymentService.createPayment(paymentData);

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error || "Falha na criação do pagamento",
          result.errorCode || "PAYMENT_CREATION_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: "Pagamento criado com sucesso",
        statusCode: 201,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error ? error.message : "Erro ao criar pagamento";

        ApiResponse.error(res, message, {
          code: "PAYMENT_CREATION_FAILED",
          statusCode: 503,
        });
      }
    }
  };

  /**
   * Obtém informações de um pagamento
   * @route GET /api/mercadopago/payments/:id
   */
  public getPaymentInfo = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const paymentId = req.params.id;

      if (!paymentId) {
        throw new ServiceUnavailableError(
          "ID do pagamento é obrigatório",
          "PAYMENT_ID_REQUIRED"
        );
      }

      const result = await paymentService.getPaymentInfo({ paymentId });

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error || "Falha ao obter informações do pagamento",
          result.errorCode || "PAYMENT_INFO_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: "Informações do pagamento obtidas com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao obter informações do pagamento";

        ApiResponse.error(res, message, {
          code: "PAYMENT_INFO_FAILED",
          statusCode: 503,
        });
      }
    }
  };

  /**
   * Captura um pagamento autorizado
   * @route POST /api/mercadopago/payments/:id/capture
   */
  public capturePayment = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const paymentId = req.params.id;
      const { amount } = req.body;

      if (!paymentId) {
        throw new ServiceUnavailableError(
          "ID do pagamento é obrigatório",
          "PAYMENT_ID_REQUIRED"
        );
      }

      const result = await paymentService.capturePayment({
        paymentId,
        amount,
      });

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error || "Falha ao capturar pagamento",
          result.errorCode || "PAYMENT_CAPTURE_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: "Pagamento capturado com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error ? error.message : "Erro ao capturar pagamento";

        ApiResponse.error(res, message, {
          code: "PAYMENT_CAPTURE_FAILED",
          statusCode: 503,
        });
      }
    }
  };

  /**
   * Cancela um pagamento
   * @route POST /api/mercadopago/payments/:id/cancel
   */
  public cancelPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const paymentId = req.params.id;

      if (!paymentId) {
        throw new ServiceUnavailableError(
          "ID do pagamento é obrigatório",
          "PAYMENT_ID_REQUIRED"
        );
      }

      const result = await paymentService.cancelPayment({ paymentId });

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error || "Falha ao cancelar pagamento",
          result.errorCode || "PAYMENT_CANCEL_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: "Pagamento cancelado com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error ? error.message : "Erro ao cancelar pagamento";

        ApiResponse.error(res, message, {
          code: "PAYMENT_CANCEL_FAILED",
          statusCode: 503,
        });
      }
    }
  };

  /**
   * Cria uma nova assinatura
   * @route POST /api/mercadopago/subscriptions
   */
  public createSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Obtém os dados da requisição e adiciona o ID do usuário para auditoria
      const subscriptionData: CreateSubscriptionRequest = {
        ...req.body,
        userId: req.user?.id,
      };

      const result = await subscriptionService.createSubscription(
        subscriptionData
      );

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error || "Falha na criação da assinatura",
          result.errorCode || "SUBSCRIPTION_CREATION_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: "Assinatura criada com sucesso",
        statusCode: 201,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error ? error.message : "Erro ao criar assinatura";

        ApiResponse.error(res, message, {
          code: "SUBSCRIPTION_CREATION_FAILED",
          statusCode: 503,
        });
      }
    }
  };

  /**
   * Obtém informações de uma assinatura
   * @route GET /api/mercadopago/subscriptions/:id
   */
  public getSubscriptionInfo = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const subscriptionId = req.params.id;

      if (!subscriptionId) {
        throw new ServiceUnavailableError(
          "ID da assinatura é obrigatório",
          "SUBSCRIPTION_ID_REQUIRED"
        );
      }

      const result = await subscriptionService.getSubscriptionInfo({
        subscriptionId,
      });

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error || "Falha ao obter informações da assinatura",
          result.errorCode || "SUBSCRIPTION_INFO_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: "Informações da assinatura obtidas com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao obter informações da assinatura";

        ApiResponse.error(res, message, {
          code: "SUBSCRIPTION_INFO_FAILED",
          statusCode: 503,
        });
      }
    }
  };

  /**
   * Cancela uma assinatura
   * @route POST /api/mercadopago/subscriptions/:id/cancel
   */
  public cancelSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const subscriptionId = req.params.id;

      if (!subscriptionId) {
        throw new ServiceUnavailableError(
          "ID da assinatura é obrigatório",
          "SUBSCRIPTION_ID_REQUIRED"
        );
      }

      const result = await subscriptionService.cancelSubscription({
        subscriptionId,
      });

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error || "Falha ao cancelar assinatura",
          result.errorCode || "SUBSCRIPTION_CANCEL_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: "Assinatura cancelada com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao cancelar assinatura";

        ApiResponse.error(res, message, {
          code: "SUBSCRIPTION_CANCEL_FAILED",
          statusCode: 503,
        });
      }
    }
  };

  /**
   * Atualiza o status de uma assinatura (pausa ou reativa)
   * @route PATCH /api/mercadopago/subscriptions/:id/status
   */
  public updateSubscriptionStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const subscriptionId = req.params.id;
      const { status } = req.body;

      if (!subscriptionId) {
        throw new ServiceUnavailableError(
          "ID da assinatura é obrigatório",
          "SUBSCRIPTION_ID_REQUIRED"
        );
      }

      if (!status || !["paused", "authorized"].includes(status)) {
        throw new ServiceUnavailableError(
          "Status inválido. Use 'paused' para pausar ou 'authorized' para reativar",
          "SUBSCRIPTION_INVALID_STATUS"
        );
      }

      const result = await subscriptionService.updateSubscriptionStatus({
        subscriptionId,
        status,
      });

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error ||
            `Falha ao ${
              status === "paused" ? "pausar" : "reativar"
            } assinatura`,
          result.errorCode || "SUBSCRIPTION_UPDATE_STATUS_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: `Assinatura ${
          status === "paused" ? "pausada" : "reativada"
        } com sucesso`,
        statusCode: 200,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao atualizar status da assinatura";

        ApiResponse.error(res, message, {
          code: "SUBSCRIPTION_UPDATE_STATUS_FAILED",
          statusCode: 503,
        });
      }
    }
  };

  /**
   * Atualiza o valor de uma assinatura
   * @route PATCH /api/mercadopago/subscriptions/:id/amount
   */
  public updateSubscriptionAmount = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const subscriptionId = req.params.id;
      const { amount } = req.body;

      if (!subscriptionId) {
        throw new ServiceUnavailableError(
          "ID da assinatura é obrigatório",
          "SUBSCRIPTION_ID_REQUIRED"
        );
      }

      if (!amount || amount <= 0) {
        throw new ServiceUnavailableError(
          "Valor da assinatura deve ser maior que zero",
          "SUBSCRIPTION_INVALID_AMOUNT"
        );
      }

      const result = await subscriptionService.updateSubscriptionAmount({
        subscriptionId,
        amount,
      });

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error || "Falha ao atualizar valor da assinatura",
          result.errorCode || "SUBSCRIPTION_UPDATE_AMOUNT_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: "Valor da assinatura atualizado com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao atualizar valor da assinatura";

        ApiResponse.error(res, message, {
          code: "SUBSCRIPTION_UPDATE_AMOUNT_FAILED",
          statusCode: 503,
        });
      }
    }
  };

  /**
   * Processa notificações de webhook do Mercado Pago
   * @route POST /api/mercadopago/webhook
   */
  public processWebhook = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const notification: WebhookNotificationRequest = req.body;
      logger.info("Webhook do Mercado Pago recebido:", notification);

      // Identifica o tipo de notificação e o recurso afetado
      const type = notification.type;
      const id = notification.data?.id;

      if (!type || !id) {
        throw new ServiceUnavailableError(
          "Notificação de webhook inválida",
          "WEBHOOK_INVALID_DATA"
        );
      }

      let result;

      // Processa de acordo com o tipo de notificação
      if (type === "payment") {
        result = await paymentService.processPaymentWebhook(id, type);
      } else if (
        type === "subscription" ||
        type === "subscription_preapproval"
      ) {
        result = await subscriptionService.processSubscriptionWebhook(id, type);
      } else {
        // Tipo de notificação não suportado
        logger.warn(`Tipo de notificação não suportado: ${type}`);
        ApiResponse.success(res, {
          success: true,
          type,
          message: "Tipo de notificação não processado",
        });
        return;
      }

      if (!result.success) {
        logger.warn(`Falha ao processar webhook: ${result.error}`, {
          type,
          id,
          error: result.error,
        });
      }

      // Sempre retorna 200 OK para o Mercado Pago, mesmo em caso de erro
      // para evitar reenvios desnecessários
      ApiResponse.success(res, {
        success: true,
        type,
        resourceId: id,
        message: "Notificação recebida e processada",
      });
    } catch (error) {
      logger.error("Erro ao processar webhook do Mercado Pago:", error);

      // Sempre retorna 200 OK para o Mercado Pago, mesmo em caso de erro
      // para evitar reenvios desnecessários
      ApiResponse.success(res, {
        success: false,
        message:
          error instanceof Error ? error.message : "Erro ao processar webhook",
      });
    }
  };
}

export default new MercadoPagoController();
