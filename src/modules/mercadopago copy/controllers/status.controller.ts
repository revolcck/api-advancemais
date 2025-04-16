/**
 * Controlador para verificação de status e configurações do MercadoPago
 * @module modules/mercadopago/controllers/status.controller
 */

import { Request, Response } from "express";
import { logger } from "@/shared/utils/logger.utils";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { MercadoPagoIntegrationType } from "../enums";
import { mercadoPagoCoreService } from "../services/core.service";
import { mercadoPagoConfig } from "../config/mercadopago.config";
import { NotFoundError, UnauthorizedError } from "@/shared/errors/AppError";

/**
 * Controlador para gerenciamento de status e informações do MercadoPago
 */
export class StatusController {
  /**
   * Verifica o status de conectividade com o MercadoPago
   * @route GET /api/mercadopago/status
   */
  public checkStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const integrationType =
        (req.query.type as MercadoPagoIntegrationType) || undefined;

      // Verifica se o tipo é válido (se fornecido)
      if (
        integrationType &&
        !Object.values(MercadoPagoIntegrationType).includes(integrationType)
      ) {
        ApiResponse.error(
          res,
          `Tipo de integração inválido: ${integrationType}`,
          {
            statusCode: 400,
            code: "INVALID_INTEGRATION_TYPE",
          }
        );
        return;
      }

      // Testa a conectividade com o MercadoPago
      const connectivityInfo = await mercadoPagoCoreService.testConnectivity(
        integrationType
      );

      if (connectivityInfo.success) {
        ApiResponse.success(res, {
          connected: true,
          account: connectivityInfo.account,
          testMode: mercadoPagoConfig.isTestMode(integrationType),
          testEnabled: mercadoPagoConfig.isTestEnabled(integrationType),
          integrationType: integrationType || "all",
        });
      } else {
        ApiResponse.error(
          res,
          connectivityInfo.error || "Falha na conexão com o MercadoPago",
          {
            statusCode: 503, // Service Unavailable
            code: connectivityInfo.errorCode || "MERCADOPAGO_CONNECTION_ERROR",
            meta: {
              testMode: mercadoPagoConfig.isTestMode(integrationType),
              testEnabled: mercadoPagoConfig.isTestEnabled(integrationType),
              integrationType: integrationType || "all",
            },
          }
        );
      }
    } catch (error) {
      logger.error("Erro ao verificar status do MercadoPago", error);
      ApiResponse.error(res, "Erro ao verificar status do MercadoPago", {
        statusCode: 500,
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  };

  /**
   * Obtém a chave pública do MercadoPago para uso no frontend
   * @route GET /api/mercadopago/public-key
   */
  public getPublicKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const integrationType =
        (req.query.type as MercadoPagoIntegrationType) || undefined;

      // Verifica se o tipo é válido (se fornecido)
      if (
        integrationType &&
        !Object.values(MercadoPagoIntegrationType).includes(integrationType)
      ) {
        ApiResponse.error(
          res,
          `Tipo de integração inválido: ${integrationType}`,
          {
            statusCode: 400,
            code: "INVALID_INTEGRATION_TYPE",
          }
        );
        return;
      }

      // Verifica se o MercadoPago está disponível
      if (!mercadoPagoConfig.isAvailable()) {
        ApiResponse.error(res, "Serviço do MercadoPago não está disponível", {
          statusCode: 503,
          code: "MERCADOPAGO_SERVICE_UNAVAILABLE",
        });
        return;
      }

      try {
        // Obtém a chave pública
        const publicKey = mercadoPagoConfig.getPublicKey(integrationType);
        const clientId = mercadoPagoConfig.getClientId(integrationType);

        ApiResponse.success(res, {
          publicKey,
          clientId,
          testMode: mercadoPagoConfig.isTestMode(integrationType),
          testEnabled: mercadoPagoConfig.isTestEnabled(integrationType),
          integrationType: integrationType || "default",
        });
      } catch (error) {
        logger.error("Erro ao obter chave pública do MercadoPago", error);
        ApiResponse.error(
          res,
          "Chave pública não disponível para o tipo de integração solicitado",
          {
            statusCode: 404,
            code: "PUBLIC_KEY_NOT_AVAILABLE",
            meta: {
              integrationType: integrationType || "default",
            },
          }
        );
      }
    } catch (error) {
      logger.error("Erro ao obter chave pública do MercadoPago", error);
      ApiResponse.error(res, "Erro ao obter chave pública do MercadoPago", {
        statusCode: 500,
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  };

  /**
   * Obtém informações de configuração do MercadoPago (sem expor tokens)
   * @route GET /api/mercadopago/config
   */
  public getConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      // Verificar se o serviço está disponível
      if (!mercadoPagoConfig.isAvailable()) {
        ApiResponse.error(res, "Serviço do MercadoPago não está disponível", {
          statusCode: 503,
          code: "MERCADOPAGO_SERVICE_UNAVAILABLE",
        });
        return;
      }

      // Obter informações de configuração sem expor tokens sensíveis
      const config = {
        isTestMode: {
          checkout: mercadoPagoConfig.isTestMode(
            MercadoPagoIntegrationType.CHECKOUT
          ),
          subscription: mercadoPagoConfig.isTestMode(
            MercadoPagoIntegrationType.SUBSCRIPTION
          ),
        },
        isTestEnabled: {
          checkout: mercadoPagoConfig.isTestEnabled(
            MercadoPagoIntegrationType.CHECKOUT
          ),
          subscription: mercadoPagoConfig.isTestEnabled(
            MercadoPagoIntegrationType.SUBSCRIPTION
          ),
        },
        availableIntegrations: {
          checkout: mercadoPagoConfig.hasConfig(
            MercadoPagoIntegrationType.CHECKOUT
          ),
          subscription: mercadoPagoConfig.hasConfig(
            MercadoPagoIntegrationType.SUBSCRIPTION
          ),
        },
        hasWebhookSecrets: {
          checkout: !!mercadoPagoConfig.getWebhookSecret(
            MercadoPagoIntegrationType.CHECKOUT
          ),
          subscription: !!mercadoPagoConfig.getWebhookSecret(
            MercadoPagoIntegrationType.SUBSCRIPTION
          ),
        },
      };

      ApiResponse.success(res, config);
    } catch (error) {
      logger.error("Erro ao obter configuração do MercadoPago", error);
      ApiResponse.error(res, "Erro ao obter configuração do MercadoPago", {
        statusCode: 500,
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  };

  /**
   * Obtém informações detalhadas de um pagamento específico
   * @route GET /api/mercadopago/payments/:id
   */
  public getPaymentInfo = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        ApiResponse.error(res, "ID do pagamento é obrigatório", {
          statusCode: 400,
          code: "MISSING_PAYMENT_ID",
        });
        return;
      }

      // Verificar se o usuário tem permissão para acessar este pagamento
      // Esta lógica depende da implementação do seu sistema
      const { user } = req;

      // Para administradores, permitir acesso a qualquer pagamento
      const isAdmin =
        user?.role === "ADMIN" ||
        user?.role === "Super Administrador" ||
        user?.role === "Financeiro";

      if (!isAdmin) {
        // Verificar se o pagamento pertence ao usuário ou à empresa do usuário
        // Esta verificação precisa ser adaptada ao seu modelo de dados
        const paymentBelongsToUser = false; // Implementar lógica real aqui

        if (!paymentBelongsToUser) {
          throw new UnauthorizedError(
            "Você não tem permissão para acessar este pagamento"
          );
        }
      }

      // Obter informações do pagamento através do adaptador
      const paymentAdapter = mercadoPagoCoreService.getPaymentAdapter();
      const payment = await paymentAdapter.get(id);

      if (!payment) {
        throw new NotFoundError("Pagamento não encontrado");
      }

      // Retorna os dados do pagamento
      ApiResponse.success(res, {
        id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        date_created: payment.date_created,
        date_approved: payment.date_approved,
        payment_method: {
          id: payment.payment_method_id,
          type: payment.payment_type_id,
        },
        transaction_amount: payment.transaction_amount,
        installments: payment.installments,
        external_reference: payment.external_reference,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        ApiResponse.error(res, error.message, {
          statusCode: 404,
          code: "PAYMENT_NOT_FOUND",
        });
      } else if (error instanceof UnauthorizedError) {
        ApiResponse.error(res, error.message, {
          statusCode: 403,
          code: "PAYMENT_ACCESS_FORBIDDEN",
        });
      } else {
        logger.error("Erro ao obter informações do pagamento", {
          error,
          paymentId: req.params.id,
          userId: req.user?.id,
        });

        ApiResponse.error(res, "Erro ao obter informações do pagamento", {
          statusCode: 500,
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }
  };

  /**
   * Obtém informações detalhadas de uma assinatura específica
   * @route GET /api/mercadopago/subscriptions/:id
   */
  public getSubscriptionInfo = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        ApiResponse.error(res, "ID da assinatura é obrigatório", {
          statusCode: 400,
          code: "MISSING_SUBSCRIPTION_ID",
        });
        return;
      }

      // Verificar se o usuário tem permissão para acessar esta assinatura
      const { user } = req;

      // Para administradores, permitir acesso a qualquer assinatura
      const isAdmin =
        user?.role === "ADMIN" ||
        user?.role === "Super Administrador" ||
        user?.role === "Financeiro";

      if (!isAdmin) {
        // Verificar se a assinatura pertence ao usuário ou à empresa do usuário
        // Esta verificação precisa ser adaptada ao seu modelo de dados
        const subscriptionBelongsToUser = false; // Implementar lógica real aqui

        if (!subscriptionBelongsToUser) {
          throw new UnauthorizedError(
            "Você não tem permissão para acessar esta assinatura"
          );
        }
      }

      // Obter informações da assinatura através do adaptador
      const subscriptionAdapter =
        mercadoPagoCoreService.getSubscriptionAdapter();
      const subscription = await subscriptionAdapter.get(id);

      if (!subscription) {
        throw new NotFoundError("Assinatura não encontrada");
      }

      // Retorna os dados da assinatura
      ApiResponse.success(res, {
        id: subscription.id,
        status: subscription.status,
        date_created: subscription.date_created,
        last_modified: subscription.last_modified,
        payer_email: subscription.payer_email,
        preapproval_plan_id: subscription.preapproval_plan_id,
        external_reference: subscription.external_reference,
        auto_recurring: subscription.auto_recurring,
        next_payment_date: subscription.next_payment_date,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        ApiResponse.error(res, error.message, {
          statusCode: 404,
          code: "SUBSCRIPTION_NOT_FOUND",
        });
      } else if (error instanceof UnauthorizedError) {
        ApiResponse.error(res, error.message, {
          statusCode: 403,
          code: "SUBSCRIPTION_ACCESS_FORBIDDEN",
        });
      } else {
        logger.error("Erro ao obter informações da assinatura", {
          error,
          subscriptionId: req.params.id,
          userId: req.user?.id,
        });

        ApiResponse.error(res, "Erro ao obter informações da assinatura", {
          statusCode: 500,
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }
  };
}
