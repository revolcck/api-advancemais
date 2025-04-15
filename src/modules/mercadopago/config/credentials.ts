/**
 * Gerenciamento de credenciais para as integrações com o MercadoPago
 * @module modules/mercadopago/config/credentials
 */

import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";
import { MercadoPagoIntegrationType } from "../enums";
import {
  IMercadoPagoCredentials,
  ICredentialsManager,
} from "../interfaces/config.interface";

/**
 * Gerenciador de credenciais do MercadoPago
 * Permite utilizar diferentes credenciais para diferentes tipos de integração
 */
export class MercadoPagoCredentialsManager implements ICredentialsManager {
  getCredentials(type: MercadoPagoIntegrationType): IMercadoPagoCredentials {
    throw new Error("Method not implemented.");
  }
  hasCredentials(type: MercadoPagoIntegrationType): boolean {
    throw new Error("Method not implemented.");
  }
  isProductionCredentials(type: MercadoPagoIntegrationType): boolean {
    throw new Error("Method not implemented.");
  }
  isTestEnabled(type: MercadoPagoIntegrationType): boolean {
    throw new Error("Method not implemented.");
  }
  updateCredentials(type: MercadoPagoIntegrationType, credentials: Partial<IMercadoPagoCredentials>): void {
    throw new Error("Method not implemented.");
  }
  getWebhookSecret(type?: MercadoPagoIntegrationType): string {
    throw new Error("Method not implemented.");
  }
  isEnabled(): boolean {
    throw new Error("Method not implemented.");
  }
  private static instance: MercadoPagoCredentialsManager;
  private credentials: Map
    MercadoPagoIntegrationType,
    IMercadoPagoCredentials
  > = new Map();
  private initialized: boolean = false;
  private webhookSecret: string = "";

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {
    this.initialize();
  }

  /**
   * Obtém a instância única do gerenciador de credenciais
   * @returns Instância do gerenciador de credenciais
   */
  public static getInstance(): MercadoPagoCredentialsManager {
    if (!MercadoPagoCredentialsManager.instance) {
      MercadoPagoCredentialsManager.instance =
        new MercadoPagoCredentialsManager();
    }
    return MercadoPagoCredentialsManager.instance;
  }

  /**
   * Extrai o ID da aplicação do token de acesso
   * O ID da aplicação é o segundo segmento após 'TEST-' ou 'APP_USR-' no token
   * @param accessToken Token de acesso do MercadoPago
   * @returns ID da aplicação ou undefined se não puder ser extraído
   */
  private extractApplicationId(accessToken: string): string {
    try {
      // Verifica se é um token de teste ou produção
      if (accessToken.startsWith("TEST-")) {
        const parts = accessToken.split("-");
        if (parts.length >= 2) {
          return parts[1];
        }
      } else if (accessToken.startsWith("APP_USR-")) {
        const parts = accessToken.split("-");
        if (parts.length >= 2) {
          return parts[1];
        }
      }

      // Caso não consiga extrair, retorna um valor default
      logger.warn(
        "Não foi possível extrair o applicationId do accessToken. Usando ID genérico."
      );
      return "unknown-app-id";
    } catch (error) {
      logger.warn("Erro ao extrair applicationId do accessToken", error);
      return "error-extracting-app-id";
    }
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
      // Verifica se o módulo está habilitado
      if (!env.mercadoPago.enabled) {
        logger.info("Módulo MercadoPago está desabilitado");
        this.initialized = true;
        return;
      }

      // Define o webhook secret global
      this.webhookSecret = env.mercadoPago.webhookSecret;

      // Determina se deve usar credenciais de produção
      const useProdCredentials = env.mercadoPago.prodEnabled;

      // Configura as credenciais para ambos os tipos de integração
      const types = [
        MercadoPagoIntegrationType.CHECKOUT,
        MercadoPagoIntegrationType.SUBSCRIPTION
      ];

      types.forEach(type => {
        if (useProdCredentials) {
          // Usar credenciais de produção
          this.credentials.set(type, {
            accessToken: env.mercadoPago.prodAccessToken,
            publicKey: env.mercadoPago.prodPublicKey,
            clientId: env.mercadoPago.prodClientId,
            clientSecret: env.mercadoPago.prodClientSecret,
            integrationType: type,
            applicationId: this.extractApplicationId(env.mercadoPago.prodAccessToken),
            isProduction: true,
            testEnabled: false,
          });
          
          logger.debug(
            `Credenciais de ${type} do MercadoPago configuradas (PRODUÇÃO)`
          );
        } else {
          // Usar credenciais de teste
          this.credentials.set(type, {
            accessToken: env.mercadoPago.accessToken,
            publicKey: env.mercadoPago.publicKey,
            clientId: "", // Não é necessário para ambiente de teste
            clientSecret: "", // Não é necessário para ambiente de teste
            integrationType: type,
            applicationId: this.extractApplicationId(env.mercadoPago.accessToken),
            isProduction: false,
            testEnabled: true,
          });
          
          logger.debug(
            `Credenciais de ${type} do MercadoPago configuradas (TESTE)`
          );
        }
      });

      // Verifica se pelo menos um tipo de credencial foi configurado
      if (this.credentials.size === 0) {
        logger.warn("Nenhuma credencial do MercadoPago foi configurada");
      } else {
        logger.info(
          `MercadoPago inicializado com ${this.credentials.size} tipos de credenciais`
        );
      }

      this.initialized = true;
    } catch (error) {
      const errorMessage = "Falha ao inicializar credenciais do MercadoPago";
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
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
  ): IMercadoPagoCredentials {
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
      !!credentials &&
      !!credentials.accessToken &&
      !!credentials.publicKey
    );
  }

  /**
   * Verifica se as credenciais para um tipo específico são de produção
   * @param type Tipo de integração
   * @returns Verdadeiro se as credenciais forem de produção
   */
  public isProductionCredentials(type: MercadoPagoIntegrationType): boolean {
    if (!this.initialized) {
      this.initialize();
    }

    const credentials = this.credentials.get(type);
    return !!credentials && !!credentials.isProduction;
  }

  /**
   * Verifica se o modo de teste está habilitado para um tipo específico
   * @param type Tipo de integração
   * @returns Verdadeiro se o modo de teste estiver habilitado
   */
  public isTestEnabled(type: MercadoPagoIntegrationType): boolean {
    if (!this.initialized) {
      this.initialize();
    }

    const credentials = this.credentials.get(type);
    return (
      !!credentials && !credentials.isProduction && !!credentials.testEnabled
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
    credentials: Partial<IMercadoPagoCredentials>
  ): void {
    if (!this.initialized) {
      this.initialize();
    }

    const currentCredentials = this.credentials.get(type);

    if (currentCredentials) {
      // Atualiza o applicationId se o accessToken foi alterado
      const newCredentials = { ...currentCredentials, ...credentials };

      if (
        credentials.accessToken &&
        credentials.accessToken !== currentCredentials.accessToken
      ) {
        newCredentials.applicationId = this.extractApplicationId(
          credentials.accessToken
        );

        // Atualiza o flag de produção com base no formato do token
        newCredentials.isProduction =
          !credentials.accessToken.startsWith("TEST-");

        // Se estamos em produção, desabilite o modo de teste
        if (newCredentials.isProduction) {
          newCredentials.testEnabled = false;
        }
      }

      this.credentials.set(type, newCredentials);
      logger.info(
        `Credenciais do MercadoPago atualizadas para o tipo: ${type}`
      );
    } else {
      // Cria novas credenciais se não existirem
      if (
        credentials.accessToken &&
        credentials.publicKey
      ) {
        const isProduction = !credentials.accessToken.startsWith("TEST-");
        const testEnabled = !isProduction && (credentials.testEnabled ?? true);

        const newCredentials: IMercadoPagoCredentials = {
          accessToken: credentials.accessToken,
          publicKey: credentials.publicKey,
          clientId: credentials.clientId || "",
          clientSecret: credentials.clientSecret || "",
          integrationType: type,
          applicationId: this.extractApplicationId(credentials.accessToken),
          isProduction,
          testEnabled,
          ...credentials,
        };

        this.credentials.set(type, newCredentials);
        logger.info(
          `Novas credenciais do MercadoPago configuradas para o tipo: ${type}`
        );
      } else {
        logger.warn(
          `Dados insuficientes para criar credenciais do tipo: ${type}`
        );
      }
    }
  }

  /**
   * Obtém o segredo para validação de webhook
   * @returns Segredo para validação de webhook ou string vazia se não configurado
   */
  public getWebhookSecret(): string {
    if (!this.initialized) {
      this.initialize();
    }

    return this.webhookSecret || "";
  }

  /**
   * Verifica se o módulo MercadoPago está habilitado
   * @returns true se o módulo estiver habilitado
   */
  public isEnabled(): boolean {
    return env.mercadoPago.enabled;
  }
}

// Exporta uma instância do gerenciador de credenciais
export const credentialsManager = MercadoPagoCredentialsManager.getInstance();