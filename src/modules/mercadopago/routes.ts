/**
 * Rotas para o módulo MercadoPago
 * @module modules/mercadopago/routes
 */

import { Router } from "express";
import { webhookController } from "./controllers/webhook.controller";
import { mercadoPagoConfig } from "./config/mercadopago.config";
import { validate } from "@/shared/middleware/validate.middleware";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { webhookSchema } from "./validators/mercadopago.validators";

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
    const { mercadoPagoCoreService } = await import(
      "./services/core.service.js"
    );
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

/**
 * Rotas para webhooks genéricos
 *
 * @route POST /api/mercadopago/webhook
 * @desc Endpoint principal para receber todos os webhooks do MercadoPago
 */
router.post(
  "/webhook",
  validate(webhookSchema),
  webhookController.processWebhook.bind(webhookController)
);

/**
 * Exporta as rotas
 */
export default router;
