/**
 * Controlador para operações de pagamento via MercadoPago
 * @module modules/mercadopago/controllers/payment.controller
 */

import { Request, Response } from "express";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { logger } from "@/shared/utils/logger.utils";
import { paymentService } from "../services/payment.service";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { CreatePaymentRequest } from "../dtos/mercadopago.dto";

/**
 * Controlador responsável pelas rotas de pagamento
 */
export class PaymentController {
  /**
   * Cria um novo pagamento
   * @route POST /api/mercadopago/payments
   */
  public async createPayment(req: Request, res: Response): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Iniciando criação de pagamento", {
        ip: req.ip,
        userId: req.user?.id,
        method: req.method,
        url: req.originalUrl,
      });

      // Obtém os dados da requisição e adiciona o ID do usuário para auditoria
      const paymentData: CreatePaymentRequest = {
        ...req.body,
        userId: req.user?.id,
      };

      const result = await paymentService.createPayment(paymentData);

      if (!result.success) {
        // Log de erro adicionado
        logger.warn("Falha na criação do pagamento", {
          error: result.error,
          errorCode: result.errorCode,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha na criação do pagamento",
          result.errorCode || "PAYMENT_CREATION_FAILED"
        );
      }

      // Log de sucesso adicionado
      logger.info("Pagamento criado com sucesso", {
        paymentId: result.paymentId,
      });

      ApiResponse.success(res, result, {
        message: "Pagamento criado com sucesso",
        statusCode: 201,
      });
    } catch (error) {
      // Log de exceção adicionado
      logger.error("Erro ao criar pagamento", error);

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
  }

  /**
   * Obtém informações de um pagamento
   * @route GET /api/mercadopago/payments/:id
   */
  public async getPayment(req: Request, res: Response): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Obtendo informações de pagamento", {
        paymentId: req.params.id,
        userId: req.user?.id,
      });

      const paymentId = req.params.id;

      if (!paymentId) {
        throw new ServiceUnavailableError(
          "ID do pagamento é obrigatório",
          "PAYMENT_ID_REQUIRED"
        );
      }

      const result = await paymentService.getPayment(paymentId);

      if (!result.success) {
        logger.warn("Falha ao obter informações do pagamento", {
          paymentId,
          error: result.error,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha ao obter informações do pagamento",
          result.errorCode || "PAYMENT_INFO_FAILED"
        );
      }

      logger.info("Informações do pagamento obtidas com sucesso", {
        paymentId,
      });

      ApiResponse.success(res, result.data, {
        message: "Informações do pagamento obtidas com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      logger.error(
        `Erro ao obter informações do pagamento: ${req.params.id}`,
        error
      );

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
  }

  /**
   * Realiza a devolução de um pagamento
   * @route POST /api/mercadopago/payments/:id/refund
   */
  public async refundPayment(req: Request, res: Response): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Iniciando devolução de pagamento", {
        paymentId: req.params.id,
        userId: req.user?.id,
        amount: req.body.amount,
      });

      const paymentId = req.params.id;
      const { amount } = req.body;

      if (!paymentId) {
        throw new ServiceUnavailableError(
          "ID do pagamento é obrigatório",
          "PAYMENT_ID_REQUIRED"
        );
      }

      const result = await paymentService.refundPayment(
        paymentId,
        amount,
        req.user?.id
      );

      if (!result.success) {
        logger.warn("Falha ao realizar devolução", {
          paymentId,
          amount,
          error: result.error,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha ao realizar devolução",
          result.errorCode || "PAYMENT_REFUND_FAILED"
        );
      }

      logger.info("Devolução realizada com sucesso", {
        paymentId,
        amount: amount || "total",
      });

      ApiResponse.success(res, result.data, {
        message: amount
          ? `Devolução parcial de ${amount} realizada com sucesso`
          : "Devolução total realizada com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      logger.error(
        `Erro ao realizar devolução do pagamento: ${req.params.id}`,
        error
      );

      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error ? error.message : "Erro ao realizar devolução";

        ApiResponse.error(res, message, {
          code: "PAYMENT_REFUND_FAILED",
          statusCode: 503,
        });
      }
    }
  }

  /**
   * Captura um pagamento autorizado
   * @route POST /api/mercadopago/payments/:id/capture
   */
  public async capturePayment(req: Request, res: Response): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Iniciando captura de pagamento", {
        paymentId: req.params.id,
        userId: req.user?.id,
      });

      const paymentId = req.params.id;

      if (!paymentId) {
        throw new ServiceUnavailableError(
          "ID do pagamento é obrigatório",
          "PAYMENT_ID_REQUIRED"
        );
      }

      const result = await paymentService.capturePayment(
        paymentId,
        req.user?.id
      );

      if (!result.success) {
        logger.warn("Falha ao capturar pagamento", {
          paymentId,
          error: result.error,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha ao capturar pagamento",
          result.errorCode || "PAYMENT_CAPTURE_FAILED"
        );
      }

      logger.info("Pagamento capturado com sucesso", {
        paymentId,
      });

      ApiResponse.success(res, result.data, {
        message: "Pagamento capturado com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      logger.error(`Erro ao capturar pagamento: ${req.params.id}`, error);

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
  }

  /**
   * Pesquisa pagamentos com critérios
   * @route GET /api/mercadopago/payments/search
   */
  public async searchPayments(req: Request, res: Response): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Pesquisando pagamentos", {
        query: req.query,
        userId: req.user?.id,
      });

      // Remove parâmetros padrão da rota e deixa apenas os critérios de busca
      const { page, limit, ...searchCriteria } = req.query;

      // Adiciona paginação se fornecida
      if (page && limit) {
        searchCriteria.offset = ((Number(page) - 1) * Number(limit)).toString();
        searchCriteria.limit = limit.toString();
      }

      const result = await paymentService.searchPayments(searchCriteria);

      if (!result.success) {
        logger.warn("Falha ao pesquisar pagamentos", {
          criteria: searchCriteria,
          error: result.error,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha ao pesquisar pagamentos",
          result.errorCode || "PAYMENT_SEARCH_FAILED"
        );
      }

      logger.info("Pesquisa de pagamentos realizada com sucesso", {
        totalResults: result.data?.paging?.total || 0,
      });

      ApiResponse.success(res, result.data, {
        message: "Pesquisa de pagamentos realizada com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      logger.error("Erro ao pesquisar pagamentos", error);

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
            : "Erro ao pesquisar pagamentos";

        ApiResponse.error(res, message, {
          code: "PAYMENT_SEARCH_FAILED",
          statusCode: 503,
        });
      }
    }
  }
}

// Exporta a instância do controlador
export const paymentController = new PaymentController();
