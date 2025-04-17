import { Preference, Payment } from "mercadopago";
import { logger } from "@/shared/utils/logger.utils";
import { mercadoPagoConfig } from "../config/mercadopago.config";
import { prisma } from "@/config/database";
import { MercadoPagoPaymentStatus } from "../../dto/payment.dto";
import {
  IPaymentService,
  PaymentPreferenceRequest,
  PaymentPreferenceResponse,
  PaymentDetails,
  NotificationData,
  PaymentConfig,
} from "../interfaces/payment.interface";
import {
  ServiceUnavailableError,
  ValidationError,
} from "@/shared/errors/AppError";
import { AuditService } from "@/shared/services/audit.service";
import { env } from "@/config/environment";
import { formatRequestMetadata } from "../../utils/mercadopago.util";

// Definição da interface para criação de preferência no MercadoPago
interface CreatePreferencePayload {
  items: Array<{
    id: string;
    title: string;
    description: string;
    quantity: number;
    unit_price: number;
    currency_id?: string;
    picture_url?: string;
    category_id?: string;
  }>;
  payer?: {
    name?: string;
    email: string;
    identification?: any;
    phone?: any;
    address?: any;
  };
  payment_methods?: any;
  back_urls?: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: string;
  notification_url?: string;
  statement_descriptor?: string;
  external_reference?: string;
  expires?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Serviço principal para operações de pagamento com MercadoPago
 */
export class PaymentService implements IPaymentService {
  private preferenceClient: Preference;
  private paymentClient: Payment;

  constructor() {
    this.preferenceClient = mercadoPagoConfig.createPreferenceClient();
    this.paymentClient = mercadoPagoConfig.createPaymentClient();
  }

  /**
   * Cria uma preferência de pagamento no MercadoPago
   */
  public async createPaymentPreference(
    preferenceRequest: PaymentPreferenceRequest,
    userId: string
  ): Promise<PaymentPreferenceResponse> {
    try {
      logger.info(`Criando preferência de pagamento para usuário ${userId}`);

      // Valida dados da requisição
      if (!preferenceRequest.items || preferenceRequest.items.length === 0) {
        throw new ValidationError(
          "A preferência de pagamento deve conter pelo menos um item"
        );
      }

      // Prepara o payload com metadados formatados
      const metadata = formatRequestMetadata({
        userId,
        ...preferenceRequest.metadata,
      });

      // Constrói o payload da requisição
      const preferencePayload: CreatePreferencePayload = {
        items: preferenceRequest.items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description || item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency_id: item.currency_id || "BRL",
          ...(item.picture_url && { picture_url: item.picture_url }),
          ...(item.category_id && { category_id: item.category_id }),
        })),
        payer: {
          name: preferenceRequest.payer.name,
          email: preferenceRequest.payer.email,
          ...(preferenceRequest.payer.identification && {
            identification: preferenceRequest.payer.identification,
          }),
          ...(preferenceRequest.payer.phone && {
            phone: preferenceRequest.payer.phone,
          }),
          ...(preferenceRequest.payer.address && {
            address: preferenceRequest.payer.address,
          }),
        },
        // Configura URLs de retorno se fornecidas
        ...(preferenceRequest.back_urls && {
          back_urls: preferenceRequest.back_urls,
        }),
        ...(preferenceRequest.auto_return && {
          auto_return: preferenceRequest.auto_return,
        }),

        // Configura URL de notificação (webhook)
        notification_url:
          preferenceRequest.notification_url ||
          `${env.appUrl}/api/mercadopago/webhooks`,

        // Adiciona referência externa se fornecida
        ...(preferenceRequest.external_reference && {
          external_reference: preferenceRequest.external_reference,
        }),

        // Adiciona descrição para fatura
        ...(preferenceRequest.statement_descriptor && {
          statement_descriptor: preferenceRequest.statement_descriptor,
        }),

        // Configura métodos de pagamento se fornecidos
        ...(preferenceRequest.payment_methods && {
          payment_methods: preferenceRequest.payment_methods,
        }),

        // Adiciona metadados
        metadata,
      };

      // Cria a preferência no MercadoPago
      const response = await this.preferenceClient.create({
        body: preferencePayload,
      });

      // Registra ação de auditoria
      AuditService.log(
        "payment_preference_created",
        "payment",
        response.id || "",
        userId,
        {
          amount: preferenceRequest.items.reduce(
            (sum, item) => sum + item.unit_price * item.quantity,
            0
          ),
          preferenceId: response.id,
        }
      );

      logger.info(`Preferência de pagamento criada: ${response.id}`);

      return {
        preferenceId: response.id || "",
        initPoint: response.init_point || "",
        sandboxInitPoint: response.sandbox_init_point || "",
      };
    } catch (error) {
      logger.error(`Erro ao criar preferência de pagamento: ${error}`, error);

      throw new ServiceUnavailableError(
        "Não foi possível processar a solicitação de pagamento no momento",
        "MERCADOPAGO_SERVICE_ERROR",
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Obtém detalhes de um pagamento pelo ID
   */
  public async getPaymentDetails(paymentId: string): Promise<PaymentDetails> {
    try {
      logger.info(`Obtendo detalhes do pagamento ${paymentId}`);

      const response = await this.paymentClient.get({ id: paymentId });

      logger.debug(`Detalhes do pagamento ${paymentId} obtidos com sucesso`);

      return response as unknown as PaymentDetails;
    } catch (error) {
      logger.error(`Erro ao obter detalhes do pagamento ${paymentId}`, error);

      throw new ServiceUnavailableError(
        "Não foi possível obter os detalhes do pagamento",
        "MERCADOPAGO_SERVICE_ERROR",
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Verifica se um pagamento foi aprovado
   */
  public async isPaymentApproved(paymentId: string): Promise<boolean> {
    const paymentDetails = await this.getPaymentDetails(paymentId);
    return paymentDetails.status === MercadoPagoPaymentStatus.APPROVED;
  }

  /**
   * Registra uma notificação de pagamento no banco de dados
   */
  public async registerPaymentNotification(
    data: NotificationData,
    rawData: any
  ): Promise<{ id: string }> {
    try {
      logger.info(`Registrando notificação de pagamento: ${data.eventType}`);

      // Registra a notificação no banco de dados
      const notification = await prisma.webhookNotification.create({
        data: {
          source: data.source,
          eventType: data.eventType,
          eventId: data.eventId,
          apiVersion: data.apiVersion,
          liveMode: data.liveMode,
          rawData: rawData,
          processStatus: "pending",
        },
      });

      logger.info(`Notificação registrada: ${notification.id}`);

      return { id: notification.id };
    } catch (error) {
      logger.error(`Erro ao registrar notificação de pagamento`, error);
      throw error;
    }
  }

  /**
   * Cancela um pagamento pendente
   */
  public async cancelPayment(
    paymentId: string
  ): Promise<{ id: string; status: string }> {
    try {
      logger.info(`Cancelando pagamento ${paymentId}`);

      const response = await this.paymentClient.cancel({ id: paymentId });

      logger.info(`Pagamento ${paymentId} cancelado com sucesso`);

      return {
        id: response.id || "",
        status: response.status || "",
      };
    } catch (error) {
      logger.error(`Erro ao cancelar pagamento ${paymentId}`, error);

      throw new ServiceUnavailableError(
        "Não foi possível cancelar o pagamento",
        "MERCADOPAGO_SERVICE_ERROR",
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Reembolsa um pagamento aprovado
   */
  public async refundPayment(
    paymentId: string
  ): Promise<{ id: string; status: string }> {
    try {
      logger.info(`Reembolsando pagamento ${paymentId}`);

      // MercadoPago SDK não possui método refund diretamente
      // Implementação alternativa usando axios ou adaptando para a versão atual do SDK
      // Esta é uma implementação fictícia, deve ser atualizada conforme a API real
      const response = await this.paymentClient.refundPartial({
        payment_id: paymentId,
      });

      logger.info(`Pagamento ${paymentId} reembolsado com sucesso`);

      return {
        id: String(response.id || ""),
        status: response.status || "",
      };
    } catch (error) {
      logger.error(`Erro ao reembolsar pagamento ${paymentId}`, error);

      throw new ServiceUnavailableError(
        "Não foi possível reembolsar o pagamento",
        "MERCADOPAGO_SERVICE_ERROR",
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Obtém configurações de pagamento para o frontend
   */
  public getPaymentConfig(): PaymentConfig {
    return {
      publicKey: mercadoPagoConfig.getPublicKey(),
      isProduction: mercadoPagoConfig.isProductionMode(),
    };
  }
}

// Exporta instância única para uso em toda a aplicação
export const paymentService = new PaymentService();
