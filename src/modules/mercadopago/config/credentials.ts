/**
 * Gerenciamento de credenciais para as integrações com o MercadoPago
 * @module modules/mercadopago/config/credentials
 */

import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";

/**
 * Tipos de integração suportados
 */
export enum MercadoPagoIntegrationType {
  SUBSCRIPTION = "subscription",
  CHECKOUT = "checkout",
}

/**
 * Interface para credenciais do Mercado Pago
 */
export interface MercadoPagoCredentials {
  accessToken: string;
  publicKey: string;
  integrationType: MercadoPagoIntegrationType;
  applicationId: string;
}

/**
 * Classe para gerenciar credenciais do Mercado Pago
 * Permite utilizar diferentes credenciais para diferentes tipos de integração
 */
export class MercadoPagoCredentialsManager {
  private static instance: MercadoPagoCredentialsManager;
  private credentials: Map<MercadoPagoIntegrationType, MercadoPagoCredentials> =
    new Map();

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {
    this.initializeCredentials();
  }

  /**
   * Obtém a instância única do gerenciador de credenciais
   */
  public static getInstance(): MercadoPagoCredentialsManager {
    if (!MercadoPagoCredentialsManager.instance) {
      MercadoPagoCredentialsManager.instance =
        new MercadoPagoCredentialsManager();
    }
    return MercadoPagoCredentialsManager.instance;
  }

  /**
   * Inicializa as credenciais a partir das variáveis de ambiente
   */
  private initializeCredentials(): void {
    try {
      // Credenciais para assinaturas - AdvanceMais
      this.credentials.set(MercadoPagoIntegrationType.SUBSCRIPTION, {
        accessToken: env.mercadoPago.subscription.accessToken,
        publicKey: env.mercadoPago.subscription.publicKey,
        integrationType: MercadoPagoIntegrationType.SUBSCRIPTION,
        applicationId: "6438147855158755", // ID fixo da aplicação de assinaturas
      });

      // Credenciais para checkout - AdcanceMais Controle Total
      this.credentials.set(MercadoPagoIntegrationType.CHECKOUT, {
        accessToken: env.mercadoPago.checkout.accessToken,
        publicKey: env.mercadoPago.checkout.publicKey,
        integrationType: MercadoPagoIntegrationType.CHECKOUT,
        applicationId: "6908434418374393", // ID fixo da aplicação de checkout
      });

      logger.info("Credenciais do MercadoPago inicializadas com sucesso");
    } catch (error) {
      logger.error("Erro ao inicializar credenciais do MercadoPago", error);
      throw new Error("Falha ao inicializar credenciais do MercadoPago");
    }
  }

  /**
   * Obtém as credenciais para um tipo específico de integração
   * @param type Tipo de integração
   * @returns Credenciais para o tipo especificado
   */
  public getCredentials(
    type: MercadoPagoIntegrationType
  ): MercadoPagoCredentials {
    const credentials = this.credentials.get(type);

    if (!credentials) {
      logger.error(
        `Credenciais não encontradas para o tipo de integração: ${type}`
      );
      throw new Error(
        `Credenciais não encontradas para o tipo de integração: ${type}`
      );
    }

    return credentials;
  }

  /**
   * Verifica se as credenciais para um tipo específico estão configuradas
   * @param type Tipo de integração
   * @returns Verdadeiro se as credenciais estiverem configuradas
   */
  public hasCredentials(type: MercadoPagoIntegrationType): boolean {
    const credentials = this.credentials.get(type);
    return (
      !!credentials && !!credentials.accessToken && !!credentials.publicKey
    );
  }

  /**
   * Atualiza as credenciais para um tipo específico (útil para testes)
   * @param type Tipo de integração
   * @param credentials Novas credenciais
   */
  public updateCredentials(
    type: MercadoPagoIntegrationType,
    credentials: Partial<MercadoPagoCredentials>
  ): void {
    const currentCredentials = this.credentials.get(type);

    if (currentCredentials) {
      this.credentials.set(type, { ...currentCredentials, ...credentials });
      logger.info(
        `Credenciais do MercadoPago atualizadas para o tipo: ${type}`
      );
    } else {
      logger.warn(
        `Tentativa de atualizar credenciais inexistentes para o tipo: ${type}`
      );
    }
  }
}

// Exportar a instância do gerenciador de credenciais
export const credentialsManager = MercadoPagoCredentialsManager.getInstance();
