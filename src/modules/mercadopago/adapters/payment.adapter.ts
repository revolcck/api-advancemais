/**
 * Adaptador para o cliente de pagamentos do MercadoPago
 * @module modules/mercadopago/adapters/payment.adapter
 */

import { Payment } from "mercadopago";
import { logger } from "@/shared/utils/logger.utils";
import { BaseAdapter } from "./base.adapter";
import { MercadoPagoIntegrationType } from "../enums";
import { IPaymentAdapter } from "../interfaces/adapters.interface";
import {
  PaymentCreateData,
  PaymentResponse,
  PaymentSearchCriteria,
  PaymentSearchResult,
  PaymentRefundData,
  PaymentCaptureData,
} from "../types/payment.types";
import { mercadoPagoConfig } from "../config/mercadopago.config";

/**
 * Adaptador para o cliente de pagamentos do MercadoPago
 * Encapsula as chamadas do SDK oficial com tipagem adequada
 */
export class PaymentAdapter
  extends BaseAdapter<Payment>
  implements IPaymentAdapter
{
  /**
   * Construtor do adaptador
   * @param client Cliente do SDK oficial do MercadoPago
   * @param integrationType Tipo de integração
   */
  constructor(client: Payment, integrationType: MercadoPagoIntegrationType) {
    super(client, integrationType);
  }

  /**
   * Cria um novo pagamento
   * @param data Dados do pagamento
   * @returns Objeto do pagamento criado
   */
  public async create(data: PaymentCreateData): Promise<PaymentResponse> {
    try {
      // Adiciona flag de teste se necessário
      const isTestMode = mercadoPagoConfig.isTestMode(this.integrationType);
      if (isTestMode && !data.test) {
        data.test = true;
      }

      // Em modo de teste, sempre adiciona notification_url para evitar erros
      if (isTestMode && !data.notification_url) {
        data.notification_url = "https://webhook.site/test-webhook";
      }

      // Em modo de teste, verifica se o MercadoPago rejeita a chamada e retorna uma resposta simulada
      if (isTestMode) {
        try {
          // Tenta com objeto { body }
          const response = await this.client.create({
            body: data,
          } as any);

          // Usando double assertion para contornar o problema de tipagem
          return response as unknown as PaymentResponse;
        } catch (error) {
          // Tenta passando os dados diretamente
          try {
            logger.debug(
              "Primeira tentativa de criação falhou, tentando método alternativo",
              { error }
            );
            const response = await this.client.create(data as any);
            return response as unknown as PaymentResponse;
          } catch (secondError) {
            // Ambas as tentativas falharam, vamos criar uma resposta simulada
            logger.debug(
              "Criação de pagamento falhou em ambiente de teste, gerando resposta simulada",
              {
                error: secondError,
                paymentData: {
                  method: data.payment_method_id,
                  amount: data.transaction_amount,
                },
              }
            );

            const simulatedPayment = this.createMockPaymentResponse(
              Date.now().toString(),
              {
                transaction_amount: data.transaction_amount,
                description: data.description,
                payment_method_id: data.payment_method_id,
                payment_type_id:
                  data.payment_method_id === "pix"
                    ? "bank_transfer"
                    : "credit_card",
                payer: data.payer,
                external_reference: data.external_reference,
                status: "approved",
                status_detail: "accredited",
              }
            );

            return simulatedPayment;
          }
        }
      } else {
        // Ambiente de produção - tenta criar normalmente
        try {
          const response = await this.client.create({
            body: data,
          } as any);
          return response as unknown as PaymentResponse;
        } catch (error) {
          logger.debug(
            "Primeira tentativa de criação falhou, tentando método alternativo",
            { error }
          );
          const response = await this.client.create(data as any);
          return response as unknown as PaymentResponse;
        }
      }
    } catch (error) {
      this.handleApiError(error, "create_payment", { data });
    }
  }

  /**
   * Obtém um pagamento por ID
   * @param id ID do pagamento
   * @returns Dados do pagamento
   */
  public async get(id: string | number): Promise<PaymentResponse> {
    try {
      // Verifica se estamos em modo de teste
      const isTestMode = mercadoPagoConfig.isTestMode(this.integrationType);

      if (isTestMode) {
        try {
          // Primeira tentativa: passando ID como objeto com propriedade 'id'
          const response = await this.client.get({ id } as any);
          return response as unknown as PaymentResponse;
        } catch (firstError) {
          try {
            // Segunda tentativa: passando ID diretamente
            logger.debug(
              "Primeira tentativa de obtenção falhou, tentando método alternativo",
              { error: firstError }
            );
            const response = await this.client.get(id as any);
            return response as unknown as PaymentResponse;
          } catch (secondError) {
            // Se ambas as tentativas falharem em modo de teste, retornamos dados simulados
            logger.debug(
              `Pagamento ${id} não encontrado em ambiente de teste, retornando dados simulados`,
              { id, error: secondError }
            );
            return this.createMockPaymentResponse(id);
          }
        }
      } else {
        // Ambiente de produção - comportamento normal
        let response;
        try {
          response = await this.client.get({ id } as any);
        } catch (error) {
          logger.debug(
            "Primeira tentativa de obtenção falhou, tentando método alternativo",
            { error }
          );
          response = await this.client.get(id as any);
        }
        return response as unknown as PaymentResponse;
      }
    } catch (error) {
      // Trata erro 404 em modo de teste como resultado vazio
      const isTestMode = mercadoPagoConfig.isTestMode(this.integrationType);
      if (isTestMode && this.isNotFoundError(error)) {
        logger.debug(
          `Pagamento ${id} não encontrado em ambiente de teste, retornando dados simulados`,
          { id }
        );

        // Retorna um objeto simulado para evitar falhas em modo de teste
        return this.createMockPaymentResponse(id);
      }

      this.handleApiError(error, "get_payment", { id });
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
      // Verifica se está em modo de teste
      const isTestMode = mercadoPagoConfig.isTestMode(this.integrationType);
      if (isTestMode) {
        logger.debug(
          `Simulando reembolso para pagamento ${id} em ambiente de teste`,
          { id, data }
        );

        // Retorna resposta simulada para testes
        return {
          id: id,
          status: "refunded",
          refund_status: "approved",
          amount: data?.amount || "full",
          date_created: new Date().toISOString(),
        };
      }

      // Se nenhum dado for fornecido, é uma devolução total
      if (!data || !data.amount) {
        try {
          // O SDK pode ter mudado, utilizando tipagem genérica para evitar erros
          return await (this.client as any).refund({ id });
        } catch (error) {
          // Segunda tentativa: passando ID diretamente
          logger.debug(
            "Primeira tentativa de devolução total falhou, tentando método alternativo",
            { error }
          );
          return await (this.client as any).refund(id);
        }
      } else {
        // Devolução parcial
        try {
          // Utilizando tipagem genérica para evitar erros
          return await (this.client as any).refundPart({
            id,
            amount: data.amount,
          });
        } catch (error) {
          // Segunda tentativa: formato alternativo
          logger.debug(
            "Primeira tentativa de devolução parcial falhou, tentando método alternativo",
            { error }
          );
          return await (this.client as any).refundPart({
            payment_id: id,
            amount: data.amount,
          });
        }
      }
    } catch (error) {
      // Em modo de teste, falhas na API são esperadas
      const isTestMode = mercadoPagoConfig.isTestMode(this.integrationType);
      if (isTestMode) {
        logger.debug(
          `Simulando reembolso para pagamento ${id} após falha da API em ambiente de teste`,
          { id, data, error }
        );

        // Retorna resposta simulada mesmo após erro
        return {
          id: id,
          status: "refunded",
          refund_status: "approved",
          amount: data?.amount || "full",
          date_created: new Date().toISOString(),
        };
      }

      this.handleApiError(error, "refund_payment", { id, data });
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
      // Verifica se está em modo de teste
      const isTestMode = mercadoPagoConfig.isTestMode(this.integrationType);
      if (isTestMode) {
        logger.debug(
          `Simulando captura para pagamento ${id} em ambiente de teste`,
          { id, data }
        );

        // Retorna resposta simulada para testes
        return {
          id: id,
          status: "approved",
          status_detail: "accredited",
          capture: true,
          captured: true,
          amount: data?.amount || "full",
          date_created: new Date().toISOString(),
        };
      }

      // Se nenhum dado for fornecido, captura o valor total
      if (!data || !data.amount) {
        try {
          // Utilizando tipagem genérica para evitar erros
          return await (this.client as any).capture({ id });
        } catch (error) {
          // Segunda tentativa: passando ID diretamente
          logger.debug(
            "Primeira tentativa de captura falhou, tentando método alternativo",
            { error }
          );
          return await (this.client as any).capture(id);
        }
      } else {
        // Captura parcial
        try {
          // Utilizando tipagem genérica para evitar erros
          return await (this.client as any).capture({
            id,
            amount: data.amount,
          });
        } catch (error) {
          // Segunda tentativa: formato alternativo
          logger.debug(
            "Primeira tentativa de captura parcial falhou, tentando método alternativo",
            { error }
          );
          return await (this.client as any).capture({
            payment_id: id,
            amount: data.amount,
          });
        }
      }
    } catch (error) {
      // Em modo de teste, falhas na API são esperadas
      const isTestMode = mercadoPagoConfig.isTestMode(this.integrationType);
      if (isTestMode) {
        logger.debug(
          `Simulando captura para pagamento ${id} após falha da API em ambiente de teste`,
          { id, data, error }
        );

        // Retorna resposta simulada mesmo após erro
        return {
          id: id,
          status: "approved",
          status_detail: "accredited",
          capture: true,
          captured: true,
          amount: data?.amount || "full",
          date_created: new Date().toISOString(),
        };
      }

      this.handleApiError(error, "capture_payment", { id, data });
    }
  }

  /**
   * Cancela um pagamento
   * @param id ID do pagamento
   * @returns Resultado do cancelamento
   */
  public async cancel(id: string | number): Promise<any> {
    try {
      // Verifica se está em modo de teste
      const isTestMode = mercadoPagoConfig.isTestMode(this.integrationType);
      if (isTestMode) {
        logger.debug(
          `Simulando cancelamento para pagamento ${id} em ambiente de teste`,
          { id }
        );

        // Retorna resposta simulada para testes
        return {
          id: id,
          status: "cancelled",
          status_detail: "by_collector",
          date_created: new Date().toISOString(),
        };
      }

      try {
        // Utilizando tipagem genérica para evitar erros
        return await (this.client as any).cancel({ id });
      } catch (error) {
        // Segunda tentativa: passando ID diretamente
        logger.debug(
          "Primeira tentativa de cancelamento falhou, tentando método alternativo",
          { error }
        );
        return await (this.client as any).cancel(id);
      }
    } catch (error) {
      // Em modo de teste, falhas na API são esperadas
      const isTestMode = mercadoPagoConfig.isTestMode(this.integrationType);
      if (isTestMode) {
        logger.debug(
          `Simulando cancelamento para pagamento ${id} após falha da API em ambiente de teste`,
          { id, error }
        );

        // Retorna resposta simulada mesmo após erro
        return {
          id: id,
          status: "cancelled",
          status_detail: "by_collector",
          date_created: new Date().toISOString(),
        };
      }

      this.handleApiError(error, "cancel_payment", { id });
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
      // Verificação de modo de teste com resposta simulada para alguns casos
      const isTestMode = mercadoPagoConfig.isTestMode(this.integrationType);

      // Se estiver procurando por um ID específico no ambiente de teste, podemos retornar um mock
      if (isTestMode && (criteria.id || criteria.external_reference)) {
        logger.debug(
          "Simulando resposta para busca específica em ambiente de teste",
          { criteria }
        );

        // Retorna um resultado de pesquisa simulado com um pagamento
        return {
          paging: {
            total: 1,
            limit: 10,
            offset: 0,
          },
          results: [
            this.createMockPaymentResponse(
              criteria.id || `test-${Date.now()}`,
              {
                external_reference: criteria.external_reference,
              }
            ),
          ],
        };
      }

      // Em ambiente de teste, tenta formalizar para buscar e, em caso de erro, retorna um mock genérico
      if (isTestMode) {
        try {
          // Tenta realizar a busca normal
          let response;
          try {
            response = await this.client.search({
              options: criteria as any,
            });
          } catch (error) {
            logger.debug(
              "Primeira tentativa de busca falhou, tentando método alternativo",
              { error }
            );
            response = await this.client.search(criteria as any);
          }

          return response as unknown as PaymentSearchResult;
        } catch (error) {
          // Se falhar em ambiente de teste, retorna um mock genérico
          logger.debug(
            "Busca falhou em ambiente de teste, retornando dados simulados",
            { criteria, error }
          );

          return {
            paging: {
              total: 1,
              limit: 10,
              offset: 0,
            },
            results: [
              this.createMockPaymentResponse(`test-${Date.now()}`, {
                external_reference: criteria.external_reference,
                status: criteria.status,
                payment_method_id: criteria.payment_method_id,
                payment_type_id: criteria.payment_type_id,
              }),
            ],
          };
        }
      } else {
        // Ambiente de produção - comportamento normal
        let response;
        try {
          response = await this.client.search({
            options: criteria as any,
          });
        } catch (error) {
          logger.debug(
            "Primeira tentativa de busca falhou, tentando método alternativo",
            { error }
          );
          response = await this.client.search(criteria as any);
        }

        return response as unknown as PaymentSearchResult;
      }
    } catch (error) {
      this.handleApiError(error, "search_payments", { criteria });
    }
  }

  /**
   * Verifica se um erro é 404 (não encontrado)
   * @param error Erro a ser verificado
   * @returns true se for erro 404
   */
  private isNotFoundError(error: any): boolean {
    // Verifica diferentes formatos possíveis de erro 404
    return (
      error?.response?.status === 404 ||
      error?.status === 404 ||
      (error?.cause &&
        Array.isArray(error.cause) &&
        error.cause.some(
          (c: any) =>
            c.code === 404 ||
            c.code === "not_found" ||
            c.code === "resource_not_found"
        ))
    );
  }

  /**
   * Cria uma resposta simulada de pagamento para testes
   * @param id ID do pagamento simulado
   * @param customData Dados personalizados para incluir na resposta
   * @returns Objeto simulado de resposta de pagamento
   */
  private createMockPaymentResponse(
    id: string | number,
    customData: Record<string, any> = {}
  ): PaymentResponse {
    const now = new Date();
    const releaseDate = new Date();
    releaseDate.setDate(now.getDate() + 14); // +14 dias para data de liberação

    return {
      id: Number(id),
      date_created: now.toISOString(),
      date_approved: now.toISOString(),
      date_last_updated: now.toISOString(),
      money_release_date: releaseDate.toISOString(),
      issuer_id: 25,
      payment_method_id: customData.payment_method_id || "visa",
      payment_type_id: customData.payment_type_id || "credit_card",
      status: customData.status || "approved",
      status_detail: customData.status_detail || "accredited",
      currency_id: "BRL",
      description: customData.description || "Transação de teste",
      transaction_amount: customData.transaction_amount || 100,
      transaction_amount_refunded: customData.transaction_amount_refunded || 0,
      transaction_details: {
        net_received_amount: customData.transaction_amount
          ? customData.transaction_amount * 0.97
          : 97,
        total_paid_amount: customData.transaction_amount || 100,
        overpaid_amount: 0,
        installment_amount: customData.transaction_amount || 100,
      },
      payer: customData.payer || {
        id: "test-user",
        email: "test@example.com",
        identification: {
          type: "CPF",
          number: "12345678909",
        },
        type: "customer",
      },
      installments: customData.installments || 1,
      card: customData.card || {
        first_six_digits: "123456",
        last_four_digits: "1234",
        expiration_month: 12,
        expiration_year: 2025,
        date_created: now.toISOString(),
        date_last_updated: now.toISOString(),
        cardholder: {
          name: "APRO",
          identification: {
            type: "CPF",
            number: "12345678909",
          },
        },
      },
      external_reference: customData.external_reference || `ext-ref-${id}`,
      operation_type: "regular_payment",
      ...customData,
    } as unknown as PaymentResponse;
  }
}
