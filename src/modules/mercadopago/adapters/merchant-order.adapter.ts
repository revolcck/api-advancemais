/**
 * Adaptador para o cliente de ordens do MercadoPago
 * @module modules/mercadopago/adapters/merchant-order.adapter
 */

import { MerchantOrder } from "mercadopago";
import { logger } from "@/shared/utils/logger.utils";
import { BaseAdapter } from "./base.adapter";
import { MercadoPagoIntegrationType } from "../enums";
import { IMerchantOrderAdapter } from "../interfaces/adapters.interface";
import { MerchantOrderResponse } from "../types/common.types";

/**
 * Adaptador para o cliente de ordens do MercadoPago
 * Encapsula as chamadas do SDK oficial com tipagem adequada
 */
export class MerchantOrderAdapter
  extends BaseAdapter<MerchantOrder>
  implements IMerchantOrderAdapter
{
  /**
   * Construtor do adaptador
   * @param client Cliente do SDK oficial do MercadoPago
   * @param integrationType Tipo de integração
   */
  constructor(
    client: MerchantOrder,
    integrationType: MercadoPagoIntegrationType
  ) {
    super(client, integrationType);
  }

  /**
   * Obtém uma ordem de mercador por ID
   * @param id ID da ordem
   * @returns Dados da ordem
   */
  public async get(id: string | number): Promise<MerchantOrderResponse> {
    try {
      let response;

      try {
        // Primeira tentativa: passando ID como objeto com propriedade 'id'
        response = await this.client.get({ id } as any);
      } catch (error) {
        // Segunda tentativa: passando ID diretamente
        logger.debug(
          "Primeira tentativa de obtenção de ordem falhou, tentando método alternativo",
          { error }
        );
        response = await this.client.get(id as any);
      }

      // Usando "double assertion" para conversão segura
      return response as unknown as MerchantOrderResponse;
    } catch (error) {
      this.handleApiError(error, "get_merchant_order", { id });
    }
  }

  /**
   * Obtém uma ordem de mercador por ID usando a preferência
   * @param preferenceId ID da preferência associada à ordem
   * @returns Dados da ordem ou null se não encontrada
   */
  public async getByPreference(
    preferenceId: string
  ): Promise<MerchantOrderResponse | null> {
    try {
      const response = await this.client.search({
        options: {
          preference_id: preferenceId,
        },
      } as any);

      // Verifica se encontrou alguma ordem
      if (response && response.elements && response.elements.length > 0) {
        return response.elements[0] as unknown as MerchantOrderResponse;
      }

      return null;
    } catch (error) {
      this.handleApiError(error, "get_merchant_order_by_preference", {
        preferenceId,
      });
    }
  }
}
