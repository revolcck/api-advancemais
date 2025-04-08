/**
 * Adaptador para o cliente de preferências do MercadoPago
 * @module modules/mercadopago/adapters/preference.adapter
 */

import { Preference } from "mercadopago";
import { logger } from "@/shared/utils/logger.utils";
import { BaseAdapter } from "./base.adapter";
import { MercadoPagoIntegrationType } from "../enums";
import { IPreferenceAdapter } from "../interfaces/adapters.interface";
import {
  PreferenceData,
  PreferenceResponse,
  PreferenceSearchCriteria,
  PreferenceSearchResult,
} from "../types/payment.types";

/**
 * Adaptador para o cliente de preferências do MercadoPago
 * Encapsula as chamadas do SDK oficial com tipagem adequada
 */
export class PreferenceAdapter
  extends BaseAdapter<Preference>
  implements IPreferenceAdapter
{
  /**
   * Construtor do adaptador
   * @param client Cliente do SDK oficial do MercadoPago
   * @param integrationType Tipo de integração
   */
  constructor(client: Preference, integrationType: MercadoPagoIntegrationType) {
    super(client, integrationType);
  }

  /**
   * Cria uma nova preferência de pagamento
   * @param data Dados da preferência
   * @returns Objeto da preferência criada
   */
  public async create(data: PreferenceData): Promise<PreferenceResponse> {
    try {
      let response;

      try {
        // Primeira tentativa: objeto com propriedade 'body'
        response = await this.client.create({
          body: data,
        } as any);
      } catch (error) {
        // Segunda tentativa: passando os dados diretamente
        logger.debug(
          "Primeira tentativa de criação falhou, tentando método alternativo",
          { error }
        );
        response = await this.client.create(data as any);
      }

      // Usando double assertion para contornar o problema de tipagem
      return response as unknown as PreferenceResponse;
    } catch (error) {
      this.handleApiError(error, "create_preference", { data });
    }
  }

  /**
   * Obtém uma preferência por ID
   * @param id ID da preferência
   * @returns Dados da preferência
   */
  public async get(id: string): Promise<PreferenceResponse> {
    try {
      let response;
      try {
        // Primeira tentativa: passando ID como objeto com propriedade 'id'
        response = await this.client.get({ id } as any);
      } catch (error) {
        // Segunda tentativa: passando ID diretamente
        logger.debug(
          "Primeira tentativa de obtenção falhou, tentando método alternativo",
          { error }
        );
        response = await this.client.get(id as any);
      }

      // Usando double assertion para contornar o problema de tipagem
      return response as unknown as PreferenceResponse;
    } catch (error) {
      this.handleApiError(error, "get_preference", { id });
    }
  }

  /**
   * Atualiza uma preferência existente
   * @param id ID da preferência
   * @param data Dados a serem atualizados
   * @returns Dados da preferência atualizada
   */
  public async update(
    id: string,
    data: Partial<PreferenceData>
  ): Promise<PreferenceResponse> {
    try {
      let response;

      try {
        // Primeira tentativa: passando com estrutura { id, body }
        response = await this.client.update({
          id,
          body: data,
        } as any);
      } catch (error) {
        // Segunda tentativa: passando objeto com id e os campos mesclados
        logger.debug(
          "Primeira tentativa de atualização falhou, tentando método alternativo",
          { error }
        );
        response = await this.client.update({
          id,
          ...data,
        } as any);
      }

      // Usando double assertion para contornar o problema de tipagem
      return response as unknown as PreferenceResponse;
    } catch (error) {
      this.handleApiError(error, "update_preference", { id, data });
    }
  }

  /**
   * Pesquisa preferências com base em critérios
   * @param criteria Critérios de pesquisa
   * @returns Resultado da pesquisa
   */
  public async search(
    criteria: PreferenceSearchCriteria
  ): Promise<PreferenceSearchResult> {
    try {
      let response;

      // De acordo com o SDK do MercadoPago mais recente, tentamos estas duas abordagens
      try {
        // Primeira tentativa: passando objeto com propriedade 'options'
        response = await this.client.search({
          options: criteria as any,
        });
      } catch (error) {
        // Segunda tentativa: passando os critérios diretamente
        logger.debug(
          "Primeira tentativa de busca falhou, tentando método alternativo",
          { error }
        );
        response = await this.client.search(criteria as any);
      }

      // Usando double assertion para contornar o problema de tipagem
      return response as unknown as PreferenceSearchResult;
    } catch (error) {
      this.handleApiError(error, "search_preferences", { criteria });
    }
  }
}
