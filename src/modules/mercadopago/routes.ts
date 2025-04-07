/**
 * Rotas core para o módulo MercadoPago
 * Apenas endpoints essenciais para verificação de status e configuração
 *
 * @module modules/mercadopago/routes
 */

import { Router } from "express";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { mercadoPagoConfig } from "./config/mercadopago.config";
import { mercadoPagoCoreService } from "./services/core.service";

// Inicializa o router
const router: Router = Router();

/**
 * @route GET /api/mercadopago/status
 * @desc Verifica o status da integração com o MercadoPago
 * @access Público
 */
router.get("/status", async (req, res) => {
  try {
    // Verifica se o serviço está disponível
    if (!mercadoPagoConfig.isAvailable()) {
      throw new ServiceUnavailableError(
        "Serviço do MercadoPago não está disponível",
        "MERCADOPAGO_SERVICE_UNAVAILABLE"
      );
    }

    // Realiza teste de conectividade
    const result = await mercadoPagoCoreService.testConnectivity();

    if (!result.success) {
      throw new ServiceUnavailableError(
        result.error || "Falha na conectividade com a API do MercadoPago",
        result.errorCode || "MERCADOPAGO_CONNECTIVITY_FAILED"
      );
    }

    // Retorna status com informações básicas
    ApiResponse.success(
      res,
      {
        available: true,
        testMode: mercadoPagoConfig.isTestMode(),
        account: result.account,
      },
      {
        message: "Serviço do MercadoPago está disponível",
        statusCode: 200,
      }
    );
  } catch (error) {
    if (error instanceof ServiceUnavailableError) {
      ApiResponse.error(res, error.message, {
        code: error.errorCode,
        statusCode: error.statusCode,
      });
    } else {
      ApiResponse.error(res, "Erro ao verificar status do MercadoPago", {
        code: "MERCADOPAGO_STATUS_ERROR",
        statusCode: 500,
      });
    }
  }
});

/**
 * @route GET /api/mercadopago/public-key
 * @desc Obtém a chave pública para uso no frontend
 * @access Público
 */
router.get("/public-key", (req, res) => {
  try {
    if (!mercadoPagoConfig.isAvailable()) {
      throw new ServiceUnavailableError(
        "Serviço do MercadoPago não está disponível",
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
        message: "Chave pública do MercadoPago obtida com sucesso",
        statusCode: 200,
      }
    );
  } catch (error) {
    if (error instanceof ServiceUnavailableError) {
      ApiResponse.error(res, error.message, {
        code: error.errorCode,
        statusCode: error.statusCode,
      });
    } else {
      ApiResponse.error(res, "Erro ao obter chave pública do MercadoPago", {
        code: "MERCADOPAGO_PUBLIC_KEY_ERROR",
        statusCode: 500,
      });
    }
  }
});

// Exporta as rotas
export default router;
