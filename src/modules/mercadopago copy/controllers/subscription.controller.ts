/**
 * Controlador para operações de assinatura via MercadoPago
 * @module modules/mercadopago/controllers/subscription.controller
 */

import { Request, Response } from "express";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { logger } from "@/shared/utils/logger.utils";
import { subscriptionService } from "../services/subscription.service";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { CreateSubscriptionRequest } from "../dtos/mercadopago.dto";

/**
 * Controlador responsável pelas rotas de assinatura
 */
export class SubscriptionController {
  /**
   * Cria uma nova assinatura
   * @route POST /api/mercadopago/subscriptions
   */
  public async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Iniciando criação de assinatura", {
        userId: req.user?.id,
        preapprovalName: req.body.preapprovalName,
        preapprovalAmount: req.body.preapprovalAmount,
      });

      // Obtém os dados da requisição e adiciona o ID do usuário para auditoria
      const subscriptionData: CreateSubscriptionRequest = {
        ...req.body,
        userId: req.user?.id,
      };

      const result = await subscriptionService.createSubscription(
        subscriptionData
      );

      if (!result.success) {
        // Log de falha adicionado
        logger.warn("Falha na criação da assinatura", {
          error: result.error,
          errorCode: result.errorCode,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha na criação da assinatura",
          result.errorCode || "SUBSCRIPTION_CREATION_FAILED"
        );
      }

      // Log de sucesso adicionado
      logger.info("Assinatura criada com sucesso", {
        subscriptionId: result.subscriptionId,
        status: result.status,
      });

      ApiResponse.success(res, result, {
        message: "Assinatura criada com sucesso",
        statusCode: 201,
      });
    } catch (error) {
      // Log de erro adicionado
      logger.error("Erro ao criar assinatura", error);

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
  }

  /**
   * Obtém informações de uma assinatura
   * @route GET /api/mercadopago/subscriptions/:id
   */
  public async getSubscription(req: Request, res: Response): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Obtendo informações de assinatura", {
        subscriptionId: req.params.id,
        userId: req.user?.id,
      });

      const subscriptionId = req.params.id;

      if (!subscriptionId) {
        throw new ServiceUnavailableError(
          "ID da assinatura é obrigatório",
          "SUBSCRIPTION_ID_REQUIRED"
        );
      }

      const result = await subscriptionService.getSubscription(subscriptionId);

      if (!result.success) {
        // Log de falha adicionado
        logger.warn("Falha ao obter informações da assinatura", {
          subscriptionId,
          error: result.error,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha ao obter informações da assinatura",
          result.errorCode || "SUBSCRIPTION_INFO_FAILED"
        );
      }

      // Log de sucesso adicionado
      logger.info("Informações da assinatura obtidas com sucesso", {
        subscriptionId,
        status: result.data?.status,
      });

      ApiResponse.success(res, result.data, {
        message: "Informações da assinatura obtidas com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      // Log de erro adicionado
      logger.error(
        `Erro ao obter informações da assinatura: ${req.params.id}`,
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
            : "Erro ao obter informações da assinatura";

        ApiResponse.error(res, message, {
          code: "SUBSCRIPTION_INFO_FAILED",
          statusCode: 503,
        });
      }
    }
  }

  /**
   * Atualiza uma assinatura
   * @route PATCH /api/mercadopago/subscriptions/:id
   */
  public async updateSubscription(req: Request, res: Response): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Atualizando assinatura", {
        subscriptionId: req.params.id,
        userId: req.user?.id,
        fieldsToUpdate: Object.keys(req.body),
      });

      const subscriptionId = req.params.id;
      const updateData = req.body;

      if (!subscriptionId) {
        throw new ServiceUnavailableError(
          "ID da assinatura é obrigatório",
          "SUBSCRIPTION_ID_REQUIRED"
        );
      }

      const result = await subscriptionService.updateSubscription(
        subscriptionId,
        updateData,
        req.user?.id
      );

      if (!result.success) {
        // Log de falha adicionado
        logger.warn("Falha ao atualizar assinatura", {
          subscriptionId,
          error: result.error,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha ao atualizar assinatura",
          result.errorCode || "SUBSCRIPTION_UPDATE_FAILED"
        );
      }

      // Log de sucesso adicionado
      logger.info("Assinatura atualizada com sucesso", {
        subscriptionId,
        newStatus: result.data?.status,
      });

      ApiResponse.success(res, result.data, {
        message: "Assinatura atualizada com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      // Log de erro adicionado
      logger.error(`Erro ao atualizar assinatura: ${req.params.id}`, error);

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
            : "Erro ao atualizar assinatura";

        ApiResponse.error(res, message, {
          code: "SUBSCRIPTION_UPDATE_FAILED",
          statusCode: 503,
        });
      }
    }
  }

  /**
   * Cancela uma assinatura
   * @route POST /api/mercadopago/subscriptions/:id/cancel
   */
  public async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Cancelando assinatura", {
        subscriptionId: req.params.id,
        userId: req.user?.id,
      });

      const subscriptionId = req.params.id;

      if (!subscriptionId) {
        throw new ServiceUnavailableError(
          "ID da assinatura é obrigatório",
          "SUBSCRIPTION_ID_REQUIRED"
        );
      }

      const result = await subscriptionService.cancelSubscription(
        subscriptionId,
        req.user?.id
      );

      if (!result.success) {
        // Log de falha adicionado
        logger.warn("Falha ao cancelar assinatura", {
          subscriptionId,
          error: result.error,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha ao cancelar assinatura",
          result.errorCode || "SUBSCRIPTION_CANCEL_FAILED"
        );
      }

      // Log de sucesso adicionado
      logger.info("Assinatura cancelada com sucesso", {
        subscriptionId,
      });

      ApiResponse.success(res, result.data, {
        message: "Assinatura cancelada com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      // Log de erro adicionado
      logger.error(`Erro ao cancelar assinatura: ${req.params.id}`, error);

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
  }

  /**
   * Pausa uma assinatura
   * @route POST /api/mercadopago/subscriptions/:id/pause
   */
  public async pauseSubscription(req: Request, res: Response): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Pausando assinatura", {
        subscriptionId: req.params.id,
        userId: req.user?.id,
      });

      const subscriptionId = req.params.id;

      if (!subscriptionId) {
        throw new ServiceUnavailableError(
          "ID da assinatura é obrigatório",
          "SUBSCRIPTION_ID_REQUIRED"
        );
      }

      const result = await subscriptionService.pauseSubscription(
        subscriptionId,
        req.user?.id
      );

      if (!result.success) {
        // Log de falha adicionado
        logger.warn("Falha ao pausar assinatura", {
          subscriptionId,
          error: result.error,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha ao pausar assinatura",
          result.errorCode || "SUBSCRIPTION_PAUSE_FAILED"
        );
      }

      // Log de sucesso adicionado
      logger.info("Assinatura pausada com sucesso", {
        subscriptionId,
      });

      ApiResponse.success(res, result.data, {
        message: "Assinatura pausada com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      // Log de erro adicionado
      logger.error(`Erro ao pausar assinatura: ${req.params.id}`, error);

      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error ? error.message : "Erro ao pausar assinatura";

        ApiResponse.error(res, message, {
          code: "SUBSCRIPTION_PAUSE_FAILED",
          statusCode: 503,
        });
      }
    }
  }

  /**
   * Reativa uma assinatura pausada
   * @route POST /api/mercadopago/subscriptions/:id/resume
   */
  public async resumeSubscription(req: Request, res: Response): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Reativando assinatura", {
        subscriptionId: req.params.id,
        userId: req.user?.id,
      });

      const subscriptionId = req.params.id;

      if (!subscriptionId) {
        throw new ServiceUnavailableError(
          "ID da assinatura é obrigatório",
          "SUBSCRIPTION_ID_REQUIRED"
        );
      }

      const result = await subscriptionService.resumeSubscription(
        subscriptionId,
        req.user?.id
      );

      if (!result.success) {
        // Log de falha adicionado
        logger.warn("Falha ao reativar assinatura", {
          subscriptionId,
          error: result.error,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha ao reativar assinatura",
          result.errorCode || "SUBSCRIPTION_RESUME_FAILED"
        );
      }

      // Log de sucesso adicionado
      logger.info("Assinatura reativada com sucesso", {
        subscriptionId,
      });

      ApiResponse.success(res, result.data, {
        message: "Assinatura reativada com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      // Log de erro adicionado
      logger.error(`Erro ao reativar assinatura: ${req.params.id}`, error);

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
            : "Erro ao reativar assinatura";

        ApiResponse.error(res, message, {
          code: "SUBSCRIPTION_RESUME_FAILED",
          statusCode: 503,
        });
      }
    }
  }

  /**
   * Atualiza o valor de uma assinatura
   * @route PATCH /api/mercadopago/subscriptions/:id/amount
   */
  public async updateSubscriptionAmount(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Atualizando valor da assinatura", {
        subscriptionId: req.params.id,
        userId: req.user?.id,
        amount: req.body.amount,
      });

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

      const result = await subscriptionService.updateSubscriptionAmount(
        subscriptionId,
        amount,
        req.user?.id
      );

      if (!result.success) {
        // Log de falha adicionado
        logger.warn("Falha ao atualizar valor da assinatura", {
          subscriptionId,
          amount,
          error: result.error,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha ao atualizar valor da assinatura",
          result.errorCode || "SUBSCRIPTION_UPDATE_AMOUNT_FAILED"
        );
      }

      // Log de sucesso adicionado
      logger.info("Valor da assinatura atualizado com sucesso", {
        subscriptionId,
        amount,
      });

      ApiResponse.success(res, result.data, {
        message: "Valor da assinatura atualizado com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      // Log de erro adicionado
      logger.error(
        `Erro ao atualizar valor da assinatura: ${req.params.id}`,
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
            : "Erro ao atualizar valor da assinatura";

        ApiResponse.error(res, message, {
          code: "SUBSCRIPTION_UPDATE_AMOUNT_FAILED",
          statusCode: 503,
        });
      }
    }
  }

  /**
   * Pesquisa assinaturas com critérios
   * @route GET /api/mercadopago/subscriptions/search
   */
  public async searchSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Pesquisando assinaturas", {
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

      const result = await subscriptionService.searchSubscriptions(
        searchCriteria
      );

      if (!result.success) {
        // Log de falha adicionado
        logger.warn("Falha ao pesquisar assinaturas", {
          criteria: searchCriteria,
          error: result.error,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha ao pesquisar assinaturas",
          result.errorCode || "SUBSCRIPTION_SEARCH_FAILED"
        );
      }

      // Log de sucesso adicionado
      logger.info("Pesquisa de assinaturas realizada com sucesso", {
        totalResults: result.data?.paging?.total || 0,
      });

      ApiResponse.success(res, result.data, {
        message: "Pesquisa de assinaturas realizada com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      // Log de erro adicionado
      logger.error("Erro ao pesquisar assinaturas", error);

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
            : "Erro ao pesquisar assinaturas";

        ApiResponse.error(res, message, {
          code: "SUBSCRIPTION_SEARCH_FAILED",
          statusCode: 503,
        });
      }
    }
  }
}

// Exporta a instância do controlador
export const subscriptionController = new SubscriptionController();
