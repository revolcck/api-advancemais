import { Payment } from "mercadopago";
import { logger } from "@/shared/utils/logger.utils";
import {
  PaymentCreateData,
  PaymentResponse,
  PaymentSearchCriteria,
  PaymentSearchResult,
  PaymentRefundData,
  PaymentCaptureData,
} from "../types/payment.types";

/**
 * Adaptador para o cliente de pagamentos do MercadoPago
 * Encapsula as chamadas do SDK oficial com tipagem adequada
 */
export class PaymentAdapter {
  private client: Payment;

  /**
   * Construtor do adaptador
   * @param client Cliente do SDK oficial do MercadoPago
   */
  constructor(client: Payment) {
    this.client = client;
  }

  /**
   * Cria um novo pagamento
   * @param data Dados do pagamento
   * @returns Objeto do pagamento criado
   */
  public async create(data: PaymentCreateData): Promise<PaymentResponse> {
    try {
      let response;

      try {
        // Primeira tentativa: objeto com propriedade 'body'
        response = await this.client.create({
          body: data,
        } as any);
      } catch (error) {
        // Segunda tentativa: passando os dados diretamente
        logger.debug(
          "Primeira tentativa de criação falhou, tentando método alternativo",
          { error }
        );
        response = await this.client.create(data as any);
      }

      // Usando double assertion para contornar o problema de tipagem
      return response as unknown as PaymentResponse;
    } catch (error) {
      logger.error("Erro ao criar pagamento no MercadoPago", error);
      throw error;
    }
  }

  /**
   * Obtém um pagamento por ID
   * @param id ID do pagamento
   * @returns Dados do pagamento
   */
  public async get(id: string | number): Promise<PaymentResponse> {
    try {
      let response;
      try {
        // Primeira tentativa: passando ID como objeto com propriedade 'id'
        response = await this.client.get({ id } as any);
      } catch (error) {
        // Segunda tentativa: passando ID diretamente
        logger.debug(
          "Primeira tentativa de obtenção falhou, tentando método alternativo",
          { error }
        );
        response = await this.client.get(id as any);
      }

      // Usando double assertion para contornar o problema de tipagem
      return response as unknown as PaymentResponse;
    } catch (error) {
      logger.error(`Erro ao obter pagamento ${id} no MercadoPago`, error);
      throw error;
    }
  }

  /**
   * Realiza a devolução total ou parcial de um pagamento
   * @param id ID do pagamento
   * @param data Dados para a devolução (opcional para devolução total)
   * @returns Resultado da devolução
   */
  public async refund(
    id: string | number,
    data?: PaymentRefundData
  ): Promise<any> {
    try {
      let response;

      // Se nenhum dado for fornecido, é uma devolução total
      if (!data || !data.amount) {
        try {
          // O SDK pode ter mudado, utilizando tipagem genérica para evitar erros
          response = await (this.client as any).refund({ id });
        } catch (error) {
          // Segunda tentativa: passando ID diretamente
          logger.debug(
            "Primeira tentativa de devolução total falhou, tentando método alternativo",
            { error }
          );
          response = await (this.client as any).refund(id);
        }
      } else {
        // Devolução parcial
        try {
          // Utilizando tipagem genérica para evitar erros
          response = await (this.client as any).refundPart({
            id,
            amount: data.amount,
          });
        } catch (error) {
          // Segunda tentativa: formato alternativo
          logger.debug(
            "Primeira tentativa de devolução parcial falhou, tentando método alternativo",
            { error }
          );
          response = await (this.client as any).refundPart({
            payment_id: id,
            amount: data.amount,
          });
        }
      }

      return response;
    } catch (error) {
      logger.error(`Erro ao reembolsar pagamento ${id} no MercadoPago`, error);
      throw error;
    }
  }

  /**
   * Captura um pagamento autorizado
   * @param id ID do pagamento
   * @param data Dados para a captura (opcional)
   * @returns Resultado da captura
   */
  public async capture(
    id: string | number,
    data?: PaymentCaptureData
  ): Promise<any> {
    try {
      let response;

      // Se nenhum dado for fornecido, captura o valor total
      if (!data || !data.amount) {
        try {
          // Utilizando tipagem genérica para evitar erros
          response = await (this.client as any).capture({ id });
        } catch (error) {
          // Segunda tentativa: passando ID diretamente
          logger.debug(
            "Primeira tentativa de captura falhou, tentando método alternativo",
            { error }
          );
          response = await (this.client as any).capture(id);
        }
      } else {
        // Captura parcial
        try {
          // Utilizando tipagem genérica para evitar erros
          response = await (this.client as any).capture({
            id,
            amount: data.amount,
          });
        } catch (error) {
          // Segunda tentativa: formato alternativo
          logger.debug(
            "Primeira tentativa de captura parcial falhou, tentando método alternativo",
            { error }
          );
          response = await (this.client as any).capture({
            payment_id: id,
            amount: data.amount,
          });
        }
      }

      return response;
    } catch (error) {
      logger.error(`Erro ao capturar pagamento ${id} no MercadoPago`, error);
      throw error;
    }
  }

  /**
   * Cancela um pagamento
   * @param id ID do pagamento
   * @returns Resultado do cancelamento
   */
  public async cancel(id: string | number): Promise<any> {
    try {
      let response;

      try {
        // Utilizando tipagem genérica para evitar erros
        response = await (this.client as any).cancel({ id });
      } catch (error) {
        // Segunda tentativa: passando ID diretamente
        logger.debug(
          "Primeira tentativa de cancelamento falhou, tentando método alternativo",
          { error }
        );
        response = await (this.client as any).cancel(id);
      }

      return response;
    } catch (error) {
      logger.error(`Erro ao cancelar pagamento ${id} no MercadoPago`, error);
      throw error;
    }
  }

  /**
   * Pesquisa pagamentos com base em critérios
   * @param criteria Critérios de pesquisa
   * @returns Resultado da pesquisa
   */
  public async search(
    criteria: PaymentSearchCriteria
  ): Promise<PaymentSearchResult> {
    try {
      let response;

      // De acordo com o SDK do MercadoPago mais recente, tentamos estas duas abordagens
      try {
        // Primeira tentativa: passando objeto com propriedade 'options'
        response = await this.client.search({
          options: criteria as any,
        });
      } catch (error) {
        // Segunda tentativa: passando os critérios diretamente
        logger.debug(
          "Primeira tentativa de busca falhou, tentando método alternativo",
          { error }
        );
        response = await this.client.search(criteria as any);
      }

      // Usando double assertion para contornar o problema de tipagem
      return response as unknown as PaymentSearchResult;
    } catch (error) {
      logger.error("Erro ao pesquisar pagamentos no MercadoPago", error);
      throw error;
    }
  }
}
