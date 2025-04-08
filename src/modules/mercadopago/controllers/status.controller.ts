/**
 * Controlador para verificação de status do MercadoPago
 * @module modules/mercadopago/controllers/status.controller
 */

import { Request, Response } from "express";
import { logger } from "@/shared/utils/logger.utils";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { MercadoPagoIntegrationType } from "../enums";
import { mercadoPagoCoreService } from "../services/core.service";
import { mercadoPagoConfig } from "../config/mercadopago.config";

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

        ApiResponse.success(res, {
          publicKey,
          testMode: mercadoPagoConfig.isTestMode(integrationType),
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
}
