/**
 * Serviço para criação e gerenciamento de preferências de pagamento
 * @module modules/mercadopago/services/preference.service
 */

import {
  Preference,
  PreferenceCreateData,
  PreferenceSearchData,
} from "mercadopago";
import { MercadoPagoBaseService } from "./base.service";
import { MercadoPagoIntegrationType } from "../config/credentials";
import { logger } from "@/shared/utils/logger.utils";
import { AuditService } from "@/shared/services/audit.service";
import { IPreferenceService } from "../interfaces";
import {
  CreatePreferenceRequest,
  CreatePreferenceResponse,
  MercadoPagoBaseResponse,
} from "../dtos/mercadopago.dto";
import { ServiceUnavailableError } from "@/shared/errors/AppError";

/**
 * Serviço para gerenciamento de preferências de pagamento
 * Implementa a interface IPreferenceService
 */
export class PreferenceService
  extends MercadoPagoBaseService
  implements IPreferenceService
{
  private preferenceClient: Preference;

  /**
   * Construtor do serviço de preferência
   * @param integrationType Tipo de integração (default: CHECKOUT)
   */
  constructor(
    integrationType: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ) {
    super(integrationType);
    this.preferenceClient = this.createPreferenceClient();
    logger.debug("Serviço de preferência do MercadoPago inicializado");
  }

  /**
   * Cria uma nova preferência de pagamento
   * @param preferenceData Dados da preferência
   * @param userId ID do usuário para auditoria
   * @returns Resultado da criação da preferência
   */
  public async createPreference(
    preferenceData: CreatePreferenceRequest
  ): Promise<CreatePreferenceResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de preferência do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      const userId = preferenceData.userId;

      // Remove campos específicos da nossa API que não são para o MercadoPago
      const { userId: _, ...mpPreferenceData } = preferenceData;

      // Prepara os dados para a API do MercadoPago
      const mercadoPagoData: PreferenceCreateData = {
        items: mpPreferenceData.items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          picture_url: item.pictureUrl,
          category_id: item.categoryId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          currency_id: item.currencyId || "BRL",
        })),
        payer: mpPreferenceData.payer
          ? {
              name: mpPreferenceData.payer.firstName,
              surname: mpPreferenceData.payer.lastName,
              email: mpPreferenceData.payer.email,
              identification: mpPreferenceData.payer.identification,
              phone: mpPreferenceData.payer.phone
                ? {
                    area_code: mpPreferenceData.payer.phone.areaCode,
                    number: mpPreferenceData.payer.phone.number,
                  }
                : undefined,
              address: mpPreferenceData.payer.address
                ? {
                    zip_code: mpPreferenceData.payer.address.zipCode,
                    street_name: mpPreferenceData.payer.address.streetName,
                    street_number: mpPreferenceData.payer.address.streetNumber,
                  }
                : undefined,
            }
          : undefined,
        back_urls: mpPreferenceData.backUrls,
        auto_return: mpPreferenceData.autoReturn,
        notification_url: mpPreferenceData.notificationUrl,
        external_reference: mpPreferenceData.externalReference,
        expires:
          mpPreferenceData.expirationDateFrom ||
          mpPreferenceData.expirationDateTo
            ? true
            : undefined,
        expiration_date_from: mpPreferenceData.expirationDateFrom,
        expiration_date_to: mpPreferenceData.expirationDateTo,
        excluded_payment_methods: mpPreferenceData.excludedPaymentMethods,
        excluded_payment_types: mpPreferenceData.excludedPaymentTypes,
      };

      logger.info("Iniciando criação de preferência no MercadoPago", {
        externalReference: mercadoPagoData.external_reference,
        items: mercadoPagoData.items?.length,
        integrationType: this.integrationType,
      });

      const result = await this.preferenceClient.create({
        body: mercadoPagoData,
      });

      // Registra a operação para auditoria
      AuditService.log("preference_created", "preference", result.id, userId, {
        externalReference: preferenceData.externalReference,
        items: preferenceData.items.length,
        integrationType: this.integrationType,
      });

      logger.info("Preferência criada com sucesso no MercadoPago", {
        preferenceId: result.id,
        integrationType: this.integrationType,
      });

      return {
        success: true,
        preferenceId: result.id,
        initPoint: result.init_point,
        sandboxInitPoint: result.sandbox_init_point,
        data: result,
      };
    } catch (error) {
      // Se já for um ServiceUnavailableError, apenas propaga
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      // Se for outro tipo de erro, formata para resposta
      const { message, code } = this.formatErrorResponse(
        error,
        "createPreference"
      );

      return {
        success: false,
        error: message,
        errorCode: code,
      };
    }
  }

  /**
   * Obtém informações de uma preferência por ID
   * @param preferenceId ID da preferência
   * @returns Detalhes da preferência
   */
  public async getPreference(
    preferenceId: string
  ): Promise<MercadoPagoBaseResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de preferência do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      logger.debug(`Obtendo informações da preferência ${preferenceId}`, {
        integrationType: this.integrationType,
      });

      const result = await this.preferenceClient.get({ id: preferenceId });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      return this.formatErrorResponse(error, "getPreference");
    }
  }

  /**
   * Atualiza uma preferência existente
   * @param preferenceId ID da preferência
   * @param updateData Dados para atualização
   * @param userId ID do usuário para auditoria
   * @returns Resultado da atualização
   */
  public async updatePreference(
    preferenceId: string,
    updateData: Partial<PreferenceCreateData>,
    userId?: string
  ): Promise<MercadoPagoBaseResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de preferência do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      logger.info(`Atualizando preferência ${preferenceId}`, {
        integrationType: this.integrationType,
        fieldsToUpdate: Object.keys(updateData),
      });

      const result = await this.preferenceClient.update({
        id: preferenceId,
        body: updateData,
      });

      // Registra a operação para auditoria
      AuditService.log(
        "preference_updated",
        "preference",
        preferenceId,
        userId,
        {
          updatedFields: Object.keys(updateData),
          integrationType: this.integrationType,
        }
      );

      logger.info(`Preferência atualizada com sucesso`, {
        preferenceId,
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

      return this.formatErrorResponse(error, "updatePreference");
    }
  }

  /**
   * Pesquisa preferências por critérios
   * @param criteria Critérios de pesquisa
   * @returns Lista de preferências
   */
  public async searchPreferences(
    criteria: PreferenceSearchData
  ): Promise<MercadoPagoBaseResponse> {
    try {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableError(
          "Serviço de preferência do MercadoPago não está disponível",
          "MERCADOPAGO_SERVICE_UNAVAILABLE"
        );
      }

      logger.debug("Pesquisando preferências no MercadoPago", {
        criteria,
        integrationType: this.integrationType,
      });

      const result = await this.preferenceClient.search({ qs: criteria });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      return this.formatErrorResponse(error, "searchPreferences");
    }
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
}

// Exporta a instância do serviço para checkout
export const preferenceService = new PreferenceService(
  MercadoPagoIntegrationType.CHECKOUT
);
