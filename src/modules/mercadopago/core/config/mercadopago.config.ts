import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";

/**
 * Configuração do cliente MercadoPago com suporte a diferentes ambientes
 */
export class MercadoPagoConfigFactory {
  private static instance: MercadoPagoConfigFactory;
  private client: MercadoPagoConfig;
  private isProduction: boolean;

  private constructor() {
    this.isProduction = env.mercadoPago.prodEnabled;

    // Define a chave de acesso conforme o ambiente
    const accessToken = this.isProduction
      ? env.mercadoPago.prodAccessToken
      : env.mercadoPago.accessToken;

    // Inicializa o cliente com os parâmetros adequados
    this.client = new MercadoPagoConfig({
      accessToken: accessToken,
    });

    logger.info(
      `Cliente MercadoPago inicializado [Modo: ${
        this.isProduction ? "PRODUÇÃO" : "TESTE"
      }]`
    );
  }

  /**
   * Obtém a instância única da configuração (Singleton)
   */
  public static getInstance(): MercadoPagoConfigFactory {
    if (!MercadoPagoConfigFactory.instance) {
      MercadoPagoConfigFactory.instance = new MercadoPagoConfigFactory();
    }
    return MercadoPagoConfigFactory.instance;
  }

  /**
   * Retorna o cliente do MercadoPago configurado
   */
  public getClient(): MercadoPagoConfig {
    return this.client;
  }

  /**
   * Retorna o modo de operação
   */
  public isProductionMode(): boolean {
    return this.isProduction;
  }

  /**
   * Retorna a chave pública para uso no frontend
   */
  public getPublicKey(): string {
    // Validação aprimorada de configurações
    const publicKey = this.isProduction
      ? env.mercadoPago.prodPublicKey
      : env.mercadoPago.publicKey;

    if (!publicKey || publicKey.length < 5) {
      logger.error(
        `Chave pública do MercadoPago não configurada corretamente [Modo: ${
          this.isProduction ? "PRODUÇÃO" : "TESTE"
        }]`
      );
      throw new Error(
        "Chave pública do MercadoPago não configurada corretamente"
      );
    }

    return publicKey;
  }

  /**
   * Cria uma instância do cliente de pagamento
   */
  public createPaymentClient(): Payment {
    return new Payment(this.client);
  }

  /**
   * Cria uma instância do cliente de preferência
   */
  public createPreferenceClient(): Preference {
    return new Preference(this.client);
  }
}

export const mercadoPagoConfig = MercadoPagoConfigFactory.getInstance();
