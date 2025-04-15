/**
 * Serviço para integração com MercadoPago Checkout API (pagamentos únicos)
 * Implementa a integração "transparent" para processamento de pagamentos
 * @module modules/mercadopago/services/checkout.service
 */

import { logger } from "@/shared/utils/logger.utils";
import { mercadoPagoConfig } from "../config/mercadopago.config";
import { PaymentAdapter, PreferenceAdapter } from "../adapters";
import { MercadoPagoIntegrationType } from "../enums";
import {
  PaymentCreateData,
  PaymentResponse,
  PreferenceData,
  PreferenceResponse,
} from "../types/payment.types";
import { ServiceUnavailableError } from "@/shared/errors/AppError";

/**
 * Serviço para processamento de pagamentos únicos via MercadoPago
 */
export class CheckoutService {
  private static instance: CheckoutService;
  private paymentAdapter: PaymentAdapter;
  private preferenceAdapter: PreferenceAdapter;

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {
    const type = MercadoPagoIntegrationType.CHECKOUT;
    this.paymentAdapter = new PaymentAdapter(
      mercadoPagoConfig.getConfig(type).getPaymentClient(),
      type
    );
    this.preferenceAdapter = new PreferenceAdapter(
      mercadoPagoConfig.getConfig(type).getPreferenceClient(),
      type
    );
  }

  /**
   * Obtém a instância única do serviço
   */
  public static getInstance(): CheckoutService {
    if (!CheckoutService.instance) {
      CheckoutService.instance = new CheckoutService();
    }
    return CheckoutService.instance;
  }

  /**
   * Cria uma preferência de pagamento para checkout transparente
   * @param data Dados da preferência de pagamento
   * @returns Objeto de preferência criado
   */
  public async createPreference(
    data: PreferenceData
  ): Promise<PreferenceResponse> {
    try {
      return await this.preferenceAdapter.create(data);
    } catch (error) {
      logger.error("Erro ao criar preferência de pagamento", error);
      throw new ServiceUnavailableError(
        "Não foi possível criar a preferência de pagamento",
        "MERCADOPAGO_PREFERENCE_ERROR",
        { error }
      );
    }
  }

  /**
   * Cria um pagamento direto via API (checkout transparente)
   * @param data Dados do pagamento
   * @returns Objeto do pagamento criado
   */
  public async createPayment(
    data: PaymentCreateData
  ): Promise<PaymentResponse> {
    try {
      // Adiciona dados específicos do checkout transparente
      const paymentData = {
        ...data,
        // Adicione quaisquer dados adicionais específicos do checkout, se necessário
      };

      return await this.paymentAdapter.create(paymentData);
    } catch (error) {
      logger.error("Erro ao processar pagamento", error);
      throw new ServiceUnavailableError(
        "Não foi possível processar o pagamento",
        "MERCADOPAGO_PAYMENT_ERROR",
        { error }
      );
    }
  }

  /**
   * Obtém informações de um pagamento
   * @param id ID do pagamento
   * @returns Informações do pagamento
   */
  public async getPayment(id: string | number): Promise<PaymentResponse> {
    try {
      return await this.paymentAdapter.get(id);
    } catch (error) {
      logger.error(`Erro ao obter informações do pagamento ${id}`, error);
      throw new ServiceUnavailableError(
        "Não foi possível obter informações do pagamento",
        "MERCADOPAGO_PAYMENT_FETCH_ERROR",
        { error }
      );
    }
  }

  /**
   * Reembolsa um pagamento
   * @param id ID do pagamento
   * @param amount Valor a ser reembolsado (opcional para reembolso total)
   * @returns Resultado do reembolso
   */
  public async refundPayment(id: string | number, amount?: number) {
    try {
      const result = await this.paymentAdapter.refund(
        id,
        amount ? { amount } : undefined
      );
      return result;
    } catch (error) {
      logger.error(`Erro ao reembolsar pagamento ${id}`, error);
      throw new ServiceUnavailableError(
        "Não foi possível processar o reembolso",
        "MERCADOPAGO_REFUND_ERROR",
        { error }
      );
    }
  }

  /**
   * Cancela um pagamento
   * @param id ID do pagamento
   * @returns Resultado do cancelamento
   */
  public async cancelPayment(id: string | number) {
    try {
      const result = await this.paymentAdapter.cancel(id);
      return result;
    } catch (error) {
      logger.error(`Erro ao cancelar pagamento ${id}`, error);
      throw new ServiceUnavailableError(
        "Não foi possível cancelar o pagamento",
        "MERCADOPAGO_CANCEL_ERROR",
        { error }
      );
    }
  }

  /**
   * Cria um QR Code para pagamento via PIX
   * @param preferenceId ID da preferência
   * @param expirationDate Data de expiração do código (opcional)
   * @returns Dados do QR Code
   */
  public async createPixQrCode(preferenceId: string, expirationDate?: Date) {
    try {
      // Obter a preferência primeiro
      const preference = await this.preferenceAdapter.get(preferenceId);

      if (!preference || !preference.id) {
        throw new Error("Preferência não encontrada");
      }

      // Implementação específica para criação de QR Code PIX
      // Esta funcionalidade requer implementação adicional de acordo com a documentação do MercadoPago

      return {
        qrCodeBase64: "QR_CODE_BASE64_DATA", // Simulação
        qrCodeText: "PIX_CODE_TEXT", // Simulação
        expirationDate:
          expirationDate || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      };
    } catch (error) {
      logger.error(
        `Erro ao criar QR Code PIX para preferência ${preferenceId}`,
        error
      );
      throw new ServiceUnavailableError(
        "Não foi possível gerar o QR Code PIX",
        "MERCADOPAGO_PIX_ERROR",
        { error }
      );
    }
  }

  /**
   * Cria um link de pagamento para boleto
   * @param preferenceId ID da preferência
   * @returns Dados do boleto
   */
  public async createBoletoPayment(preferenceId: string) {
    try {
      // Obter a preferência primeiro
      const preference = await this.preferenceAdapter.get(preferenceId);

      if (!preference || !preference.id) {
        throw new Error("Preferência não encontrada");
      }

      // Implementação específica para criação de boleto
      // Esta funcionalidade requer implementação adicional de acordo com a documentação do MercadoPago

      return {
        boletoUrl: "BOLETO_URL", // Simulação
        barCode: "BARCODE_TEXT", // Simulação
        expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 dias
      };
    } catch (error) {
      logger.error(
        `Erro ao criar boleto para preferência ${preferenceId}`,
        error
      );
      throw new ServiceUnavailableError(
        "Não foi possível gerar o boleto",
        "MERCADOPAGO_BOLETO_ERROR",
        { error }
      );
    }
  }

  /**
   * Cria um token de cartão para pagamento seguro
   * @param cardData Dados do cartão
   * @returns Token do cartão
   */
  public async createCardToken(cardData: any) {
    try {
      // Implementação específica para criação de token de cartão
      // Esta funcionalidade requer implementação adicional de acordo com a documentação do MercadoPago

      return {
        token: "CARD_TOKEN", // Simulação
        expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      };
    } catch (error) {
      logger.error(`Erro ao criar token de cartão`, error);
      throw new ServiceUnavailableError(
        "Não foi possível gerar o token do cartão",
        "MERCADOPAGO_CARD_TOKEN_ERROR",
        { error }
      );
    }
  }
}

// Exporta uma instância do serviço
export const checkoutService = CheckoutService.getInstance();
