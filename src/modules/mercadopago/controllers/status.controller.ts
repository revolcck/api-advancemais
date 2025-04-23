import { Request, Response } from "express";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { logger } from "@/shared/utils/logger.utils";
import { mercadoPagoConfig } from "../core/config/mercadopago.config";
import { env } from "@/config/environment";
import axios from "axios";
import { ServiceUnavailableError } from "@/shared/errors/AppError";

/**
 * Controlador para verificação de status e configuração do MercadoPago
 */
export class StatusController {
  /**
   * Verifica status de conectividade com o MercadoPago
   * @route GET /api/mercadopago/status
   */
  public checkStatus = async (_req: Request, res: Response): Promise<void> => {
    try {
      logger.info("Verificando status de conectividade com o MercadoPago");

      // Verifica se consegue acessar a API do MercadoPago
      const accessToken = mercadoPagoConfig.isProductionMode()
        ? env.mercadoPago.prodAccessToken
        : env.mercadoPago.accessToken;

      const response = await axios.get(
        "https://api.mercadopago.com/v1/payment_methods",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Verifica se o status da resposta é 200 e se há dados retornados
      const isConnected =
        response.status === 200 && Array.isArray(response.data);

      // Prepara informações adicionais para o status
      const statusInfo = {
        connected: isConnected,
        mode: mercadoPagoConfig.isProductionMode() ? "PRODUCTION" : "TEST",
        environment: env.nodeEnv,
        timestamp: new Date().toISOString(),
      };

      ApiResponse.success(res, statusInfo, {
        message: isConnected
          ? "Conectado ao MercadoPago com sucesso"
          : "Falha ao verificar conexão com MercadoPago",
      });
    } catch (error) {
      logger.error("Erro ao verificar status do MercadoPago", error);

      // Retorna erro indicando falha na conectividade
      ApiResponse.success(
        res,
        {
          connected: false,
          mode: mercadoPagoConfig.isProductionMode() ? "PRODUCTION" : "TEST",
          environment: env.nodeEnv,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Erro desconhecido",
        },
        {
          message: "Falha ao conectar com o MercadoPago",
        }
      );
    }
  };

  /**
   * Obtém a chave pública do MercadoPago para uso no frontend
   * @route GET /api/mercadopago/status/public-key
   */
  public getPublicKey = async (_req: Request, res: Response): Promise<void> => {
    try {
      logger.info("Obtendo chave pública do MercadoPago");

      // Verificação de configuração
      if (!mercadoPagoConfig) {
        throw new ServiceUnavailableError(
          "Configuração do MercadoPago não disponível",
          "MERCADOPAGO_CONFIG_ERROR"
        );
      }

      // Obtém chave pública do serviço de configuração
      const publicKey = mercadoPagoConfig.getPublicKey();

      if (!publicKey) {
        throw new ServiceUnavailableError(
          "Chave pública do MercadoPago não disponível",
          "MERCADOPAGO_KEY_ERROR"
        );
      }

      const isProduction = mercadoPagoConfig.isProductionMode();

      // Sucesso: retorna a chave pública
      ApiResponse.success(res, {
        publicKey,
        isProduction,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Erro ao obter chave pública do MercadoPago", error);

      // Retorna um erro personalizado para não expor detalhes internos
      if (error instanceof ServiceUnavailableError) {
        throw error;
      } else {
        throw new ServiceUnavailableError(
          "Não foi possível obter a chave pública do MercadoPago",
          "MERCADOPAGO_SERVICE_ERROR"
        );
      }
    }
  };

  /**
   * Obtém informações de configuração do MercadoPago
   * @route GET /api/mercadopago/status/config
   */
  public getConfig = async (_req: Request, res: Response): Promise<void> => {
    try {
      logger.info("Obtendo configurações do MercadoPago");

      // Retorna configurações seguras (sem expor tokens)
      const config = {
        mode: mercadoPagoConfig.isProductionMode() ? "PRODUCTION" : "TEST",
        environment: env.nodeEnv,
        publicKey: mercadoPagoConfig.getPublicKey(),
        webhookUrl: `${env.appUrl}/api/mercadopago/webhooks`,
        supportedPaymentMethods: ["credit_card", "debit_card", "pix", "ticket"],
        installmentsEnabled: true,
        maxInstallments: 12,
      };

      // Sucesso: retorna configurações
      ApiResponse.success(res, config);
    } catch (error) {
      logger.error("Erro ao obter configurações do MercadoPago", error);
      throw error;
    }
  };
}
