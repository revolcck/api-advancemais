/**
 * Serviço base para integrações com o MercadoPago
 * Fornece funcionalidades comuns para os serviços específicos
 * @module modules/mercadopago/services/base.service
 */

import {
  MercadoPagoConfig,
  Payment,
  Customer,
  PreApproval,
  Preference,
  MerchantOrder,
} from "mercadopago";
import { logger } from "@/shared/utils/logger.utils";
import { mercadoPagoConfig } from "../config/mercadopago.config";
import {
  MercadoPagoIntegrationType,
  credentialsManager,
} from "../config/credentials";

/**
 * Classe base para serviços do MercadoPago
 * Implementa o padrão Factory Method para criar instâncias dos clientes específicos
 */
export abstract class MercadoPagoBaseService {
  protected config: MercadoPagoConfig;
  protected accessToken: string;
  protected publicKey: string;
  protected integrationType: MercadoPagoIntegrationType;

  /**
   * Construtor do serviço base
   * @param integrationType Tipo de integração (subscription ou checkout)
   */
  constructor(integrationType: MercadoPagoIntegrationType) {
    this.integrationType = integrationType;
    this.config = mercadoPagoConfig.getConfig(integrationType);

    const credentials = credentialsManager.getCredentials(integrationType);
    this.accessToken = credentials.accessToken;
    this.publicKey = credentials.publicKey;

    logger.debug(
      `Serviço MercadoPago inicializado para integração: ${integrationType}`
    );
  }

  /**
   * Cria uma instância do cliente de pagamento
   * @returns Cliente de pagamento
   */
  protected createPaymentClient(): Payment {
    return new Payment(this.config);
  }

  /**
   * Cria uma instância do cliente de cliente
   * @returns Cliente de cliente
   */
  protected createCustomerClient(): Customer {
    return new Customer(this.config);
  }

  /**
   * Cria uma instância do cliente de pré-aprovação (assinaturas)
   * @returns Cliente de pré-aprovação
   */
  protected createPreApprovalClient(): PreApproval {
    return new PreApproval(this.config);
  }

  /**
   * Cria uma instância do cliente de preferência
   * @returns Cliente de preferência
   */
  protected createPreferenceClient(): Preference {
    return new Preference(this.config);
  }

  /**
   * Cria uma instância do cliente de ordem do comerciante
   * @returns Cliente de ordem do comerciante
   */
  protected createMerchantOrderClient(): MerchantOrder {
    return new MerchantOrder(this.config);
  }

  /**
   * Trata erros de forma padronizada
   * @param error Erro a ser tratado
   * @param operation Nome da operação que gerou o erro
   * @throws Error com informações detalhadas
   */
  protected handleError(error: any, operation: string): never {
    const errorMessage = error?.message || "Erro desconhecido";
    const errorDetails = error?.cause || error?.response?.data || {};

    logger.error(`Erro no MercadoPago durante ${operation}`, {
      operation,
      error: errorMessage,
      details: errorDetails,
      integrationType: this.integrationType,
    });

    throw new Error(`Erro no MercadoPago - ${operation}: ${errorMessage}`);
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
   * Verifica se o serviço está configurado corretamente
   * @returns Verdadeiro se o serviço estiver configurado
   */
  public isConfigured(): boolean {
    return (
      mercadoPagoConfig.hasConfig(this.integrationType) &&
      credentialsManager.hasCredentials(this.integrationType)
    );
  }
}
