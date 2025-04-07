/**
 * Gerenciamento de credenciais para as integrações com o MercadoPago
 * @module modules/mercadopago/config/credentials
 */

import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";

/**
 * Tipos de integração suportados pelo MercadoPago
 */
export enum MercadoPagoIntegrationType {
  /** Integração para assinaturas */
  SUBSCRIPTION = "subscription",

  /** Integração para checkout */
  CHECKOUT = "checkout",
}

/**
 * Interface para credenciais do MercadoPago
 */
export interface MercadoPagoCredentials {
  /** Token de acesso à API do MercadoPago */
  accessToken: string;

  /** Chave pública para uso no frontend */
  publicKey: string;

  /** Tipo de integração */
  integrationType: MercadoPagoIntegrationType;

  /** ID da aplicação no MercadoPago */
  applicationId: string;
}

/**
 * Gerenciador de credenciais do MercadoPago
 * Permite utilizar diferentes credenciais para diferentes tipos de integração
 */
export class MercadoPagoCredentialsManager {
  private static instance: MercadoPagoCredentialsManager;
  private credentials: Map<MercadoPagoIntegrationType, MercadoPagoCredentials> =
    new Map();
  private initialized: boolean = false;

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {
    this.initialize();
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
   * @throws Error se falhar ao inicializar credenciais
   */
  private initialize(): void {
    if (this.initialized) {
      return;
    }

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

      this.initialized = true;
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
   * @throws Error se credenciais não forem encontradas
   */
  public getCredentials(
    type: MercadoPagoIntegrationType
  ): MercadoPagoCredentials {
    if (!this.initialized) {
      this.initialize();
    }

    const credentials = this.credentials.get(type);

    if (!credentials) {
      const errorMessage = `Credenciais não encontradas para o tipo de integração: ${type}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    return credentials;
  }

  /**
   * Verifica se as credenciais para um tipo específico estão configuradas
   * @param type Tipo de integração
   * @returns Verdadeiro se as credenciais estiverem configuradas
   */
  public hasCredentials(type: MercadoPagoIntegrationType): boolean {
    if (!this.initialized) {
      this.initialize();
    }

    const credentials = this.credentials.get(type);
    return (
      !!credentials && !!credentials.accessToken && !!credentials.publicKey
    );
  }

  /**
   * Atualiza as credenciais para um tipo específico
   * Útil principalmente para testes ou troca de ambiente
   *
   * @param type Tipo de integração
   * @param credentials Novas credenciais
   */
  public updateCredentials(
    type: MercadoPagoIntegrationType,
    credentials: Partial<MercadoPagoCredentials>
  ): void {
    if (!this.initialized) {
      this.initialize();
    }

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

export const credentialsManager = MercadoPagoCredentialsManager.getInstance();
