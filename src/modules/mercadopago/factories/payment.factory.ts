/**
 * Fábrica para serviços de pagamento do MercadoPago
 * Responsável por criar e configurar serviços de pagamento
 * @module modules/mercadopago/factories/payment.factory
 */

import { MercadoPagoIntegrationType } from "../enums";
import { IPaymentService } from "../interfaces/services.interface";
import { mercadoPagoCoreService } from "../services/core.service";
import {
  PaymentCreateData,
  PaymentResponse,
  PreferenceData,
  PreferenceResponse,
} from "../types/payment.types";
import { logger } from "@/shared/utils/logger.utils";
import { ServiceUnavailableError } from "@/shared/errors/AppError";

/**
 * Implementação padrão do serviço de pagamento
 * Utiliza os adaptadores do core para realizar operações de pagamento
 */
class DefaultPaymentService implements IPaymentService {
  private integrationType: MercadoPagoIntegrationType;

  /**
   * Construtor do serviço de pagamento
   * @param integrationType Tipo de integração
   */
  constructor(integrationType: MercadoPagoIntegrationType) {
    this.integrationType = integrationType;
  }

  /**
   * Cria um novo pagamento
   * @param data Dados para criação do pagamento
   * @param options Opções adicionais
   */
  public async createPayment(
    data: PaymentCreateData,
    options?: Record<string, any>
  ): Promise<PaymentResponse> {
    try {
      const paymentAdapter = mercadoPagoCoreService.getPaymentAdapter(
        this.integrationType
      );
      return await paymentAdapter.create(data);
    } catch (error) {
      logger.error("Erro ao criar pagamento", { error, data });
      throw new ServiceUnavailableError(
        "Não foi possível processar o pagamento no momento",
        "PAYMENT_CREATION_FAILED"
      );
    }
  }

  /**
   * Obtém detalhes de um pagamento por ID
   * @param id ID do pagamento
   */
  public async getPayment(id: string | number): Promise<PaymentResponse> {
    try {
      const paymentAdapter = mercadoPagoCoreService.getPaymentAdapter(
        this.integrationType
      );
      return await paymentAdapter.get(id);
    } catch (error) {
      logger.error(`Erro ao obter pagamento ${id}`, { error });
      throw new ServiceUnavailableError(
        "Não foi possível obter os detalhes do pagamento",
        "PAYMENT_RETRIEVAL_FAILED"
      );
    }
  }

  /**
   * Reembolsa um pagamento (total ou parcial)
   * @param id ID do pagamento
   * @param amount Valor a ser reembolsado (opcional para reembolso total)
   */
  public async refundPayment(
    id: string | number,
    amount?: number
  ): Promise<any> {
    try {
      const paymentAdapter = mercadoPagoCoreService.getPaymentAdapter(
        this.integrationType
      );
      return await paymentAdapter.refund(id, amount ? { amount } : undefined);
    } catch (error) {
      logger.error(`Erro ao reembolsar pagamento ${id}`, { error, amount });
      throw new ServiceUnavailableError(
        "Não foi possível processar o reembolso no momento",
        "PAYMENT_REFUND_FAILED"
      );
    }
  }

  /**
   * Cria uma preferência de pagamento para Checkout Pro
   * @param data Dados para criação da preferência
   * @param options Opções adicionais
   */
  public async createPreference(
    data: PreferenceData,
    options?: Record<string, any>
  ): Promise<PreferenceResponse> {
    try {
      const preferenceAdapter = mercadoPagoCoreService.getPreferenceAdapter(
        this.integrationType
      );
      return await preferenceAdapter.create(data);
    } catch (error) {
      logger.error("Erro ao criar preferência de pagamento", { error, data });
      throw new ServiceUnavailableError(
        "Não foi possível criar a preferência de pagamento",
        "PREFERENCE_CREATION_FAILED"
      );
    }
  }

  /**
   * Obtém detalhes de uma preferência por ID
   * @param id ID da preferência
   */
  public async getPreference(id: string): Promise<PreferenceResponse> {
    try {
      const preferenceAdapter = mercadoPagoCoreService.getPreferenceAdapter(
        this.integrationType
      );
      return await preferenceAdapter.get(id);
    } catch (error) {
      logger.error(`Erro ao obter preferência de pagamento ${id}`, { error });
      throw new ServiceUnavailableError(
        "Não foi possível obter os detalhes da preferência de pagamento",
        "PREFERENCE_RETRIEVAL_FAILED"
      );
    }
  }

  /**
   * Atualiza uma preferência existente
   * @param id ID da preferência
   * @param data Dados para atualização
   */
  public async updatePreference(
    id: string,
    data: Partial<PreferenceData>
  ): Promise<PreferenceResponse> {
    try {
      const preferenceAdapter = mercadoPagoCoreService.getPreferenceAdapter(
        this.integrationType
      );
      return await preferenceAdapter.update(id, data);
    } catch (error) {
      logger.error(`Erro ao atualizar preferência de pagamento ${id}`, {
        error,
        data,
      });
      throw new ServiceUnavailableError(
        "Não foi possível atualizar a preferência de pagamento",
        "PREFERENCE_UPDATE_FAILED"
      );
    }
  }
}

/**
 * Fábrica para criação de serviços de pagamento
 */
export class PaymentFactory {
  /**
   * Cria um serviço de pagamento para o tipo de integração especificado
   * @param type Tipo de integração (default: CHECKOUT)
   * @returns Serviço de pagamento
   */
  public static createPaymentService(
    type: MercadoPagoIntegrationType = MercadoPagoIntegrationType.CHECKOUT
  ): IPaymentService {
    return new DefaultPaymentService(type);
  }
}
