/**
 * Adaptador para o cliente de assinaturas do MercadoPago
 * @module modules/mercadopago/adapters/subscription.adapter
 */

import { PreApproval } from "mercadopago";
import { logger } from "@/shared/utils/logger.utils";
import { BaseAdapter } from "./base.adapter";
import { MercadoPagoIntegrationType } from "../enums";
import { ISubscriptionAdapter } from "../interfaces/adapters.interface";
import {
  SubscriptionCreateData,
  SubscriptionUpdateData,
  SubscriptionResponse,
  SubscriptionSearchCriteria,
  SubscriptionSearchResult,
} from "../types/subscription.types";

/**
 * Adaptador para o cliente de assinaturas do MercadoPago
 * Encapsula as chamadas do SDK oficial com tipagem adequada
 */
export class SubscriptionAdapter
  extends BaseAdapter<PreApproval>
  implements ISubscriptionAdapter
{
  /**
   * Construtor do adaptador
   * @param client Cliente do SDK oficial do MercadoPago
   */
  constructor(client: PreApproval) {
    super(client, MercadoPagoIntegrationType.SUBSCRIPTION);
  }

  /**
   * Cria uma nova assinatura
   * @param data Dados da assinatura
   * @returns Objeto da assinatura criada
   */
  public async create(
    data: SubscriptionCreateData
  ): Promise<SubscriptionResponse> {
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
          "Primeira tentativa de criação de assinatura falhou, tentando método alternativo",
          { error }
        );
        response = await this.client.create(data as any);
      }

      // Usando double assertion para contornar o problema de tipagem
      return response as unknown as SubscriptionResponse;
    } catch (error) {
      this.handleApiError(error, "create_subscription", { data });
    }
  }

  /**
   * Obtém uma assinatura por ID
   * @param id ID da assinatura
   * @returns Dados da assinatura
   */
  public async get(id: string): Promise<SubscriptionResponse> {
    try {
      let response;
      try {
        // Primeira tentativa: passando ID como objeto com propriedade 'id'
        response = await this.client.get({ id } as any);
      } catch (error) {
        // Segunda tentativa: passando ID diretamente
        logger.debug(
          "Primeira tentativa de obtenção de assinatura falhou, tentando método alternativo",
          { error }
        );
        response = await this.client.get(id as any);
      }

      // Usando double assertion para contornar o problema de tipagem
      return response as unknown as SubscriptionResponse;
    } catch (error) {
      this.handleApiError(error, "get_subscription", { id });
    }
  }

  /**
   * Atualiza uma assinatura existente
   * @param id ID da assinatura
   * @param data Dados a serem atualizados
   * @returns Dados da assinatura atualizada
   */
  public async update(
    id: string,
    data: SubscriptionUpdateData
  ): Promise<SubscriptionResponse> {
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
          "Primeira tentativa de atualização de assinatura falhou, tentando método alternativo",
          { error }
        );
        response = await this.client.update({
          id,
          ...data,
        } as any);
      }

      // Usando double assertion para contornar o problema de tipagem
      return response as unknown as SubscriptionResponse;
    } catch (error) {
      this.handleApiError(error, "update_subscription", { id, data });
    }
  }

  /**
   * Pesquisa assinaturas com base em critérios
   * @param criteria Critérios de pesquisa
   * @returns Resultado da pesquisa
   */
  public async search(
    criteria: SubscriptionSearchCriteria
  ): Promise<SubscriptionSearchResult> {
    try {
      let response;

      try {
        // Primeira tentativa: passando objeto com propriedade 'options'
        response = await this.client.search({
          options: criteria,
        } as any);
      } catch (error) {
        // Segunda tentativa: passando os critérios diretamente
        logger.debug(
          "Primeira tentativa de busca de assinaturas falhou, tentando método alternativo",
          { error }
        );
        response = await this.client.search(criteria as any);
      }

      // Usando double assertion para contornar o problema de tipagem
      return response as unknown as SubscriptionSearchResult;
    } catch (error) {
      this.handleApiError(error, "search_subscriptions", { criteria });
    }
  }
}
