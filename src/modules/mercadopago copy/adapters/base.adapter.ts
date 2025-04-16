/**
 * Adaptador base para integrações com o MercadoPago
 * @module modules/mercadopago/adapters/base.adapter
 */

import { logger } from "@/shared/utils/logger.utils";
import { MercadoPagoIntegrationType } from "../enums";

/**
 * Classe abstrata que serve como base para todos os adaptadores do MercadoPago
 * Implementa funcionalidades comuns a todos os adaptadores
 */
export abstract class BaseAdapter<T> {
  protected client: T;
  protected integrationType: MercadoPagoIntegrationType;

  /**
   * Construtor do adaptador base
   * @param client Cliente do SDK oficial do MercadoPago
   * @param integrationType Tipo de integração
   */
  constructor(client: T, integrationType: MercadoPagoIntegrationType) {
    this.client = client;
    this.integrationType = integrationType;
  }

  /**
   * Trata erros de comunicação com a API do MercadoPago de forma padronizada
   * @param error Erro original
   * @param operation Nome da operação que falhou
   * @param context Informações adicionais de contexto
   * @throws O erro original com informações adicionais de contexto
   */
  protected handleApiError(
    error: unknown,
    operation: string,
    context: Record<string, any> = {}
  ): never {
    const errorDetails = {
      operation,
      integrationType: this.integrationType,
      ...context,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : String(error), // Converte para string se não for um Error
    };

    logger.error(
      `Erro ao executar operação ${operation} no MercadoPago`,
      errorDetails
    );

    // Se não for um Error, converte para Error
    if (!(error instanceof Error)) {
      throw new Error(`Erro na operação ${operation}: ${String(error)}`);
    }

    throw error;
  }

  /**
   * Obtém o tipo de integração deste adaptador
   * @returns Tipo de integração
   */
  public getIntegrationType(): MercadoPagoIntegrationType {
    return this.integrationType;
  }

  /**
   * Obtém o cliente original do SDK
   * @returns Cliente do SDK
   */
  public getClient(): T {
    return this.client;
  }
}
