/**
 * Controlador para operações de preferência de pagamento via MercadoPago
 * @module modules/mercadopago/controllers/preference.controller
 */

import { Request, Response } from "express";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { logger } from "@/shared/utils/logger.utils";
import { preferenceService } from "../services/preference.service";
import { ServiceUnavailableError } from "@/shared/errors/AppError";
import { CreatePreferenceRequest } from "../dtos/mercadopago.dto";

/**
 * Controlador responsável pelas rotas de preferência de pagamento
 */
export class PreferenceController {
  /**
   * Cria uma nova preferência de pagamento
   * @route POST /api/mercadopago/preferences
   */
  public async createPreference(req: Request, res: Response): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Iniciando criação de preferência de pagamento", {
        userId: req.user?.id,
        items: req.body.items?.length || 0,
      });

      // Obtém os dados da requisição e adiciona o ID do usuário para auditoria
      const preferenceData: CreatePreferenceRequest = {
        ...req.body,
        userId: req.user?.id,
      };

      const result = await preferenceService.createPreference(preferenceData);

      if (!result.success) {
        // Log de falha adicionado
        logger.warn("Falha na criação da preferência de pagamento", {
          error: result.error,
          errorCode: result.errorCode,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha na criação da preferência de pagamento",
          result.errorCode || "PREFERENCE_CREATION_FAILED"
        );
      }

      // Log de sucesso adicionado
      logger.info("Preferência de pagamento criada com sucesso", {
        preferenceId: result.preferenceId,
        initPoint: result.initPoint ? true : false,
      });

      ApiResponse.success(res, result, {
        message: "Preferência de pagamento criada com sucesso",
        statusCode: 201,
      });
    } catch (error) {
      // Log de erro adicionado
      logger.error("Erro ao criar preferência de pagamento", error);

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
            : "Erro ao criar preferência de pagamento";

        ApiResponse.error(res, message, {
          code: "PREFERENCE_CREATION_FAILED",
          statusCode: 503,
        });
      }
    }
  }

  /**
   * Obtém informações de uma preferência de pagamento
   * @route GET /api/mercadopago/preferences/:id
   */
  public async getPreference(req: Request, res: Response): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Obtendo informações de preferência", {
        preferenceId: req.params.id,
        userId: req.user?.id,
      });

      const preferenceId = req.params.id;

      if (!preferenceId) {
        throw new ServiceUnavailableError(
          "ID da preferência é obrigatório",
          "PREFERENCE_ID_REQUIRED"
        );
      }

      const result = await preferenceService.getPreference(preferenceId);

      if (!result.success) {
        // Log de falha adicionado
        logger.warn("Falha ao obter informações da preferência", {
          preferenceId,
          error: result.error,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha ao obter informações da preferência",
          result.errorCode || "PREFERENCE_INFO_FAILED"
        );
      }

      // Log de sucesso adicionado
      logger.info("Informações da preferência obtidas com sucesso", {
        preferenceId,
      });

      ApiResponse.success(res, result.data, {
        message: "Informações da preferência obtidas com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      // Log de erro adicionado
      logger.error(
        `Erro ao obter informações da preferência: ${req.params.id}`,
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
            : "Erro ao obter informações da preferência";

        ApiResponse.error(res, message, {
          code: "PREFERENCE_INFO_FAILED",
          statusCode: 503,
        });
      }
    }
  }

  /**
   * Atualiza uma preferência de pagamento
   * @route PATCH /api/mercadopago/preferences/:id
   */
  public async updatePreference(req: Request, res: Response): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Atualizando preferência de pagamento", {
        preferenceId: req.params.id,
        userId: req.user?.id,
        fieldsToUpdate: Object.keys(req.body),
      });

      const preferenceId = req.params.id;
      const updateData = req.body;

      if (!preferenceId) {
        throw new ServiceUnavailableError(
          "ID da preferência é obrigatório",
          "PREFERENCE_ID_REQUIRED"
        );
      }

      const result = await preferenceService.updatePreference(
        preferenceId,
        updateData,
        req.user?.id
      );

      if (!result.success) {
        // Log de falha adicionado
        logger.warn("Falha ao atualizar preferência", {
          preferenceId,
          error: result.error,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha ao atualizar preferência",
          result.errorCode || "PREFERENCE_UPDATE_FAILED"
        );
      }

      // Log de sucesso adicionado
      logger.info("Preferência atualizada com sucesso", {
        preferenceId,
      });

      ApiResponse.success(res, result.data, {
        message: "Preferência atualizada com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      // Log de erro adicionado
      logger.error(`Erro ao atualizar preferência: ${req.params.id}`, error);

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
            : "Erro ao atualizar preferência";

        ApiResponse.error(res, message, {
          code: "PREFERENCE_UPDATE_FAILED",
          statusCode: 503,
        });
      }
    }
  }

  /**
   * Pesquisa preferências com critérios
   * @route GET /api/mercadopago/preferences/search
   */
  public async searchPreferences(req: Request, res: Response): Promise<void> {
    try {
      // Log adicionado para uso efetivo do logger
      logger.debug("Pesquisando preferências", {
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

      const result = await preferenceService.searchPreferences(searchCriteria);

      if (!result.success) {
        // Log de falha adicionado
        logger.warn("Falha ao pesquisar preferências", {
          criteria: searchCriteria,
          error: result.error,
        });

        throw new ServiceUnavailableError(
          result.error || "Falha ao pesquisar preferências",
          result.errorCode || "PREFERENCE_SEARCH_FAILED"
        );
      }

      // Log de sucesso adicionado
      logger.info("Pesquisa de preferências realizada com sucesso", {
        totalResults: result.data?.paging?.total || 0,
      });

      ApiResponse.success(res, result.data, {
        message: "Pesquisa de preferências realizada com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      // Log de erro adicionado
      logger.error("Erro ao pesquisar preferências", error);

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
            : "Erro ao pesquisar preferências";

        ApiResponse.error(res, message, {
          code: "PREFERENCE_SEARCH_FAILED",
          statusCode: 503,
        });
      }
    }
  }
}

// Exporta a instância do controlador
export const preferenceController = new PreferenceController();
