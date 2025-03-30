/**
 * Serviço de notificações para eventos do MercadoPago
 * Responsável por enviar emails usando o serviço de comunicação para diversas ações:
 * - Nova compra de curso ou assinatura
 * - Estorno de compra
 * - Renovação da assinatura
 * - Cancelamento da assinatura
 *
 * @module modules/mercadopago/services/notification.service
 */

import { logger } from "@/shared/utils/logger.utils";
import { emailService } from "@/modules/communications/services/email.service";
import { EmailOptions } from "@/modules/communications/dtos/communications.dto";
import { formatCurrency } from "@/shared/utils/format.utils";
import { env } from "@/config/environment";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { templateService, EmailTemplateType } from "./template.service";

/**
 * Interface para dados de transação (pagamentos e assinaturas)
 */
interface TransactionData {
  id: string;
  customerName?: string;
  customerEmail: string;
  productName?: string;
  amount: number;
  date: Date;
  paymentMethod?: string;
  reference?: string;
  status?: string;
  nextPaymentDate?: Date;
  additionalInfo?: Record<string, any>;
}

/**
 * Serviço para envio de notificações relacionadas ao MercadoPago
 */
export class MercadoPagoNotificationService {
  private static instance: MercadoPagoNotificationService;

  private constructor() {}

  /**
   * Obtém a instância única do serviço
   */
  public static getInstance(): MercadoPagoNotificationService {
    if (!MercadoPagoNotificationService.instance) {
      MercadoPagoNotificationService.instance =
        new MercadoPagoNotificationService();
    }
    return MercadoPagoNotificationService.instance;
  }

  /**
   * Envia um email de notificação de nova compra
   * @param data Dados da transação
   * @returns Resultado do envio
   */
  public async sendPurchaseConfirmation(
    data: TransactionData
  ): Promise<boolean> {
    try {
      logger.info(`Enviando confirmação de compra para ${data.customerEmail}`, {
        transactionId: data.id,
        amount: data.amount,
      });

      const subject = `Confirmação de Compra - ${
        data.productName || "Produto"
      }`;

      // Prepara variáveis para o template
      const formattedDate = format(
        data.date,
        "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
        { locale: ptBR }
      );
      const formattedAmount = formatCurrency(data.amount);

      // Processa o template com as variáveis
      const htmlContent = templateService.processTemplate(
        EmailTemplateType.PURCHASE_CONFIRMATION,
        {
          customerName: data.customerName ? `, ${data.customerName}` : "",
          productName: data.productName || "Produto AdvanceMais",
          amount: formattedAmount,
          date: formattedDate,
          paymentMethod: data.paymentMethod || "Cartão de crédito",
          transactionId: data.id,
          reference: data.reference,
        }
      );

      if (!htmlContent) {
        throw new Error("Falha ao processar template de confirmação de compra");
      }

      // Configura as opções do email
      const emailOptions: EmailOptions = {
        subject,
        htmlContent,
        to: data.customerEmail,
        toName: data.customerName,
        senderName: env.brevo.senderName || "AdvanceMais",
        senderEmail: env.brevo.senderEmail,
      };

      // Envia o email
      const result = await emailService.sendEmail(emailOptions);

      if (!result.success) {
        logger.error(`Falha ao enviar confirmação de compra: ${result.error}`, {
          transactionId: data.id,
          customerEmail: data.customerEmail,
        });
        return false;
      }

      logger.info(
        `Confirmação de compra enviada com sucesso para ${data.customerEmail}`,
        {
          messageId: result.messageId,
          transactionId: data.id,
        }
      );

      return true;
    } catch (error) {
      logger.error(`Erro ao enviar confirmação de compra`, {
        error,
        transactionId: data.id,
        customerEmail: data.customerEmail,
      });
      return false;
    }
  }

  /**
   * Envia um email de notificação de estorno/reembolso
   * @param data Dados da transação
   * @returns Resultado do envio
   */
  public async sendRefundNotification(data: TransactionData): Promise<boolean> {
    try {
      logger.info(
        `Enviando notificação de estorno para ${data.customerEmail}`,
        {
          transactionId: data.id,
          amount: data.amount,
        }
      );

      const subject = `Confirmação de Estorno - ${
        data.productName || "Produto"
      }`;

      // Prepara variáveis para o template
      const formattedDate = format(
        data.date,
        "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
        { locale: ptBR }
      );
      const formattedAmount = formatCurrency(data.amount);

      // Processa o template com as variáveis
      const htmlContent = templateService.processTemplate(
        EmailTemplateType.REFUND_NOTIFICATION,
        {
          customerName: data.customerName ? `, ${data.customerName}` : "",
          productName: data.productName || "Produto AdvanceMais",
          amount: formattedAmount,
          date: formattedDate,
          transactionId: data.id,
          reference: data.reference,
        }
      );

      if (!htmlContent) {
        throw new Error(
          "Falha ao processar template de notificação de estorno"
        );
      }

      // Configura as opções do email
      const emailOptions: EmailOptions = {
        subject,
        htmlContent,
        to: data.customerEmail,
        toName: data.customerName,
        senderName: env.brevo.senderName || "AdvanceMais",
        senderEmail: env.brevo.senderEmail,
      };

      // Envia o email
      const result = await emailService.sendEmail(emailOptions);

      if (!result.success) {
        logger.error(
          `Falha ao enviar notificação de estorno: ${result.error}`,
          {
            transactionId: data.id,
            customerEmail: data.customerEmail,
          }
        );
        return false;
      }

      logger.info(
        `Notificação de estorno enviada com sucesso para ${data.customerEmail}`,
        {
          messageId: result.messageId,
          transactionId: data.id,
        }
      );

      return true;
    } catch (error) {
      logger.error(`Erro ao enviar notificação de estorno`, {
        error,
        transactionId: data.id,
        customerEmail: data.customerEmail,
      });
      return false;
    }
  }

  /**
   * Envia um email de notificação de renovação de assinatura
   * @param data Dados da transação
   * @returns Resultado do envio
   */
  public async sendSubscriptionRenewalNotification(
    data: TransactionData
  ): Promise<boolean> {
    try {
      logger.info(
        `Enviando notificação de renovação de assinatura para ${data.customerEmail}`,
        {
          subscriptionId: data.id,
          amount: data.amount,
        }
      );

      const subject = `Renovação de Assinatura - ${
        data.productName || "Serviço"
      }`;

      // Prepara variáveis para o template
      const formattedDate = format(
        data.date,
        "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
        { locale: ptBR }
      );
      const formattedAmount = formatCurrency(data.amount);

      let formattedNextPaymentDate = null;
      if (data.nextPaymentDate) {
        formattedNextPaymentDate = format(
          data.nextPaymentDate,
          "dd 'de' MMMM 'de' yyyy",
          { locale: ptBR }
        );
      }

      // Processa o template com as variáveis
      const htmlContent = templateService.processTemplate(
        EmailTemplateType.SUBSCRIPTION_RENEWAL,
        {
          customerName: data.customerName ? `, ${data.customerName}` : "",
          productName: data.productName || "Assinatura AdvanceMais",
          amount: formattedAmount,
          date: formattedDate,
          subscriptionId: data.id,
          nextPaymentDate: formattedNextPaymentDate,
          reference: data.reference,
        }
      );

      if (!htmlContent) {
        throw new Error(
          "Falha ao processar template de renovação de assinatura"
        );
      }

      // Configura as opções do email
      const emailOptions: EmailOptions = {
        subject,
        htmlContent,
        to: data.customerEmail,
        toName: data.customerName,
        senderName: env.brevo.senderName || "AdvanceMais",
        senderEmail: env.brevo.senderEmail,
      };

      // Envia o email
      const result = await emailService.sendEmail(emailOptions);

      if (!result.success) {
        logger.error(
          `Falha ao enviar notificação de renovação: ${result.error}`,
          {
            subscriptionId: data.id,
            customerEmail: data.customerEmail,
          }
        );
        return false;
      }

      logger.info(
        `Notificação de renovação enviada com sucesso para ${data.customerEmail}`,
        {
          messageId: result.messageId,
          subscriptionId: data.id,
        }
      );

      return true;
    } catch (error) {
      logger.error(`Erro ao enviar notificação de renovação`, {
        error,
        subscriptionId: data.id,
        customerEmail: data.customerEmail,
      });
      return false;
    }
  }

  /**
   * Envia um email de notificação de cancelamento de assinatura
   * @param data Dados da transação
   * @returns Resultado do envio
   */
  public async sendSubscriptionCancellationNotification(
    data: TransactionData
  ): Promise<boolean> {
    try {
      logger.info(
        `Enviando notificação de cancelamento de assinatura para ${data.customerEmail}`,
        {
          subscriptionId: data.id,
        }
      );

      const subject = `Cancelamento de Assinatura - ${
        data.productName || "Serviço"
      }`;

      // Prepara variáveis para o template
      const formattedDate = format(
        data.date,
        "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
        { locale: ptBR }
      );
      const reactivationUrl = `${env.appUrl}/subscriptions/reactivate?id=${data.id}`;

      // Processa o template com as variáveis
      const htmlContent = templateService.processTemplate(
        EmailTemplateType.SUBSCRIPTION_CANCELLATION,
        {
          customerName: data.customerName ? `, ${data.customerName}` : "",
          productName: data.productName || "Assinatura AdvanceMais",
          date: formattedDate,
          subscriptionId: data.id,
          reference: data.reference,
          reactivationUrl: reactivationUrl,
        }
      );

      if (!htmlContent) {
        throw new Error(
          "Falha ao processar template de cancelamento de assinatura"
        );
      }

      // Configura as opções do email
      const emailOptions: EmailOptions = {
        subject,
        htmlContent,
        to: data.customerEmail,
        toName: data.customerName,
        senderName: env.brevo.senderName || "AdvanceMais",
        senderEmail: env.brevo.senderEmail,
      };

      // Envia o email
      const result = await emailService.sendEmail(emailOptions);

      if (!result.success) {
        logger.error(
          `Falha ao enviar notificação de cancelamento: ${result.error}`,
          {
            subscriptionId: data.id,
            customerEmail: data.customerEmail,
          }
        );
        return false;
      }

      logger.info(
        `Notificação de cancelamento enviada com sucesso para ${data.customerEmail}`,
        {
          messageId: result.messageId,
          subscriptionId: data.id,
        }
      );

      return true;
    } catch (error) {
      logger.error(`Erro ao enviar notificação de cancelamento`, {
        error,
        subscriptionId: data.id,
        customerEmail: data.customerEmail,
      });
      return false;
    }
  }
}

// Exporta uma instância do serviço de notificação
export const mercadoPagoNotificationService =
  MercadoPagoNotificationService.getInstance();
