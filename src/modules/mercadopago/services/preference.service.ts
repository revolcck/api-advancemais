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
import { AuditService, AuditAction } from "@/shared/services/audit.service";

/**
 * Serviço para gerenciamento de preferências de pagamento
 */
export class PreferenceService extends MercadoPagoBaseService {
  private preferenceClient: Preference;

  /**
   * Construtor do serviço de preferência
   * @param integrationType Tipo de integração
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
    preferenceData: PreferenceCreateData,
    userId?: string
  ): Promise<any> {
    try {
      logger.info("Iniciando criação de preferência no MercadoPago", {
        externalReference: preferenceData.external_reference,
        integrationType: this.integrationType,
      });

      const result = await this.preferenceClient.create({
        body: preferenceData,
      });

      // Registra a operação para auditoria
      AuditService.log(AuditAction.CREATE, "preference", result.id, userId, {
        externalReference: preferenceData.external_reference,
        items: preferenceData.items?.length,
        integrationType: this.integrationType,
      });

      logger.info("Preferência criada com sucesso no MercadoPago", {
        preferenceId: result.id,
        integrationType: this.integrationType,
      });

      return result;
    } catch (error) {
      this.handleError(error, "createPreference");
    }
  }

  /**
   * Obtém informações de uma preferência por ID
   * @param preferenceId ID da preferência
   * @returns Detalhes da preferência
   */
  public async getPreference(preferenceId: string): Promise<any> {
    try {
      logger.debug(`Obtendo informações da preferência ${preferenceId}`, {
        integrationType: this.integrationType,
      });

      const result = await this.preferenceClient.get({ id: preferenceId });

      return result;
    } catch (error) {
      this.handleError(error, "getPreference");
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
  ): Promise<any> {
    try {
      logger.info(`Atualizando preferência ${preferenceId}`, {
        integrationType: this.integrationType,
      });

      const result = await this.preferenceClient.update({
        id: preferenceId,
        body: updateData,
      });

      // Registra a operação para auditoria
      AuditService.log(AuditAction.UPDATE, "preference", preferenceId, userId, {
        updatedFields: Object.keys(updateData),
        integrationType: this.integrationType,
      });

      logger.info(`Preferência atualizada com sucesso`, {
        preferenceId,
        integrationType: this.integrationType,
      });

      return result;
    } catch (error) {
      this.handleError(error, "updatePreference");
    }
  }

  /**
   * Pesquisa preferências por critérios
   * @param criteria Critérios de pesquisa
   * @returns Lista de preferências
   */
  public async searchPreferences(criteria: PreferenceSearchData): Promise<any> {
    try {
      logger.debug("Pesquisando preferências no MercadoPago", {
        criteria,
        integrationType: this.integrationType,
      });

      const result = await this.preferenceClient.search({ qs: criteria });

      return result;
    } catch (error) {
      this.handleError(error, "searchPreferences");
    }
  }
}

// Exporta a instância do serviço para checkout
export const preferenceService = new PreferenceService(
  MercadoPagoIntegrationType.CHECKOUT
);
