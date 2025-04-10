/**
 * Serviço base para integrações com o MercadoPago
 * Fornece funcionalidades comuns para os serviços específicos
 *
 * @module modules/mercadopago/services/base.service
 */

import {
  MercadoPagoConfig as SDKMercadoPagoConfig,
  Payment,
  Customer,
  PreApproval,
  Preference,
  MerchantOrder,
  CardToken,
} from "mercadopago";
import { logger } from "@/shared/utils/logger.utils";
import { mercadoPagoConfig } from "../config/mercadopago.config";
import { MercadoPagoIntegrationType } from "../enums";
import { ServiceUnavailableError } from "@/shared/errors/AppError";

/**
 * Classe base para serviços do MercadoPago
 * Implementa o padrão Factory Method para criar instâncias dos clientes específicos
 */
export abstract class MercadoPagoBaseService {
  protected sdkConfig: SDKMercadoPagoConfig;
  protected accessToken: string;
  protected publicKey: string;
  protected integrationType: MercadoPagoIntegrationType;

  /**
   * Construtor do serviço base
   * @param integrationType Tipo de integração (subscription ou checkout)
   */
  constructor(integrationType: MercadoPagoIntegrationType) {
    this.integrationType = integrationType;
    this.initializeService();
  }

  /**
   * Inicializa o serviço com as configurações do tipo de integração
   * @throws Error se a configuração não for encontrada
   */
  private initializeService(): void {
    try {
      // Verifica se o serviço está disponível
      if (!mercadoPagoConfig.isAvailable()) {
        throw new Error("Serviço MercadoPago não está disponível");
      }

      // Obtém a configuração do SDK para o tipo específico
      if (!mercadoPagoConfig.hasConfig(this.integrationType)) {
        throw new Error(
          `Configuração não encontrada para o tipo de integração: ${this.integrationType}`
        );
      }

      // Obtém a configuração do SDK
      this.sdkConfig = mercadoPagoConfig.getConfig(this.integrationType);

      // Obtém as credenciais
      this.accessToken = mercadoPagoConfig.getAccessToken(this.integrationType);
      this.publicKey = mercadoPagoConfig.getPublicKey(this.integrationType);

      logger.debug(
        `Serviço MercadoPago inicializado para integração: ${this.integrationType}`
      );
    } catch (error) {
      const errorMessage = `Falha ao inicializar serviço MercadoPago para tipo: ${this.integrationType}`;
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Cria uma instância do cliente de pagamento
   * @returns Cliente de pagamento
   */
  protected createPaymentClient(): Payment {
    return new Payment(this.sdkConfig);
  }

  /**
   * Cria uma instância do cliente de cliente
   * @returns Cliente de cliente
   */
  protected createCustomerClient(): Customer {
    return new Customer(this.sdkConfig);
  }

  /**
   * Cria uma instância do cliente de pré-aprovação (assinaturas)
   * @returns Cliente de pré-aprovação
   */
  protected createPreApprovalClient(): PreApproval {
    return new PreApproval(this.sdkConfig);
  }

  /**
   * Cria uma instância do cliente de preferência
   * @returns Cliente de preferência
   */
  protected createPreferenceClient(): Preference {
    return new Preference(this.sdkConfig);
  }

  /**
   * Cria uma instância do cliente de ordem do comerciante
   * @returns Cliente de ordem do comerciante
   */
  protected createMerchantOrderClient(): MerchantOrder {
    return new MerchantOrder(this.sdkConfig);
  }

  /**
   * Cria uma instância do cliente de token de cartão
   * @returns Cliente de token de cartão
   */
  protected createCardTokenClient(): CardToken {
    return new CardToken(this.sdkConfig);
  }

  /**
   * Trata erros de forma padronizada
   * @param error Erro original
   * @param operation Nome da operação
   * @returns Erro formatado
   */
  protected handleError(error: any, operation: string): never {
    // Cria uma mensagem de erro detalhada
    const errorMessage = error?.message || "Erro desconhecido";
    const errorDetails = error?.cause || error?.response?.data || {};

    // Registra o erro no log
    logger.error(`Erro no MercadoPago durante ${operation}`, {
      operation,
      error: errorMessage,
      details: errorDetails,
      integrationType: this.integrationType,
    });

    // Transforma em ServiceUnavailableError para tratamento padronizado pela API
    throw new ServiceUnavailableError(
      `Erro no MercadoPago - ${operation}: ${errorMessage}`,
      `MERCADOPAGO_${operation.toUpperCase()}_ERROR`,
      {
        details: errorDetails,
        integrationType: this.integrationType,
      }
    );
  }

  /**
   * Formata os valores monetários para o formato do MercadoPago (centavos)
   * @param amount Valor em reais
   * @returns Valor em centavos
   */
  protected formatAmount(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Converte valores de centavos para reais
   * @param cents Valor em centavos
   * @returns Valor em reais
   */
  protected centsToReais(cents: number): number {
    return parseFloat((cents / 100).toFixed(2));
  }

  /**
   * Verifica se o serviço está configurado corretamente
   * @returns Verdadeiro se o serviço estiver configurado
   */
  public isConfigured(): boolean {
    return mercadoPagoConfig.hasConfig(this.integrationType);
  }

  /**
   * Obtém o tipo de integração deste serviço
   * @returns Tipo de integração
   */
  public getIntegrationType(): MercadoPagoIntegrationType {
    return this.integrationType;
  }

  /**
   * Obtém a chave pública para uso no frontend
   * @returns Chave pública
   */
  public getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Obtém o token de acesso
   * @returns Token de acesso
   */
  public getAccessToken(): string {
    return this.accessToken;
  }
}
