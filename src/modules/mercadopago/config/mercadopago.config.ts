// src/modules/mercadopago/config/mercadopago.config.ts

import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";
import { MercadoPagoConfig } from "mercadopago";

/**
 * Classe de configuração para o Mercado Pago
 * Responsável por gerenciar as configurações e validar a disponibilidade da integração
 */
export class MercadoPagoConfiguration {
  private static instance: MercadoPagoConfiguration;
  private initialized: boolean = false;
  private _config: MercadoPagoConfig | null = null;

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {
    this.initialize();
  }

  /**
   * Obtém a instância única da configuração
   */
  public static getInstance(): MercadoPagoConfiguration {
    if (!MercadoPagoConfiguration.instance) {
      MercadoPagoConfiguration.instance = new MercadoPagoConfiguration();
    }
    return MercadoPagoConfiguration.instance;
  }

  /**
   * Inicializa a configuração do Mercado Pago
   */
  private initialize(): void {
    try {
      // Verifica se as credenciais estão configuradas
      if (!env.mercadoPago.accessToken) {
        logger.warn("Credenciais do Mercado Pago não configuradas");
        this.initialized = false;
        return;
      }

      // Cria a configuração do Mercado Pago
      this._config = new MercadoPagoConfig({
        accessToken: env.mercadoPago.accessToken,
        options: {
          timeout: env.mercadoPago.timeout,
        },
      });

      this.initialized = true;
      logger.info("Configuração do Mercado Pago inicializada com sucesso");
    } catch (error) {
      logger.error("Erro ao inicializar configuração do Mercado Pago:", error);
      this.initialized = false;
    }
  }

  /**
   * Obtém a configuração do Mercado Pago
   */
  public get config(): MercadoPagoConfig {
    if (!this._config) {
      throw new Error("Configuração do Mercado Pago não inicializada");
    }
    return this._config;
  }

  /**
   * Verifica se a integração com o Mercado Pago está disponível
   */
  public isAvailable(): boolean {
    return this.initialized && env.mercadoPago.enabled;
  }

  /**
   * Obtém a chave pública para uso no frontend
   */
  public getPublicKey(): string {
    return env.mercadoPago.publicKey;
  }

  /**
   * Verifica se as credenciais são de teste
   */
  public isTestMode(): boolean {
    return env.mercadoPago.accessToken.startsWith("TEST-");
  }

  /**
   * Retorna o tempo de timeout configurado
   */
  public getTimeout(): number {
    return env.mercadoPago.timeout;
  }
}

// Exporta uma instância da configuração
export const mercadoPagoConfig = MercadoPagoConfiguration.getInstance();
