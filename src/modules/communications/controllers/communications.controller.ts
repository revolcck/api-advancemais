import { Request, Response } from "express";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { logger } from "@/shared/utils/logger.utils";
import {
  EmailOptions,
  SmsOptions,
  WhatsAppOptions,
} from "../dto/communications.dto";
import { emailService } from "../services/email.service";
import { smsService } from "../services/sms.service";
import { whatsAppService } from "../services/whatsapp.service";
import { brevoService } from "../services/brevo.service";
import { ServiceUnavailableError } from "@/shared/errors/AppError";

/**
 * Controlador para operações de comunicação (email, SMS, WhatsApp)
 */
export class CommunicationsController {
  /**
   * Testa a conectividade com a API da Brevo
   * @route GET /api/communications/test-connectivity
   */
  public testConnectivity = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!brevoService.isAvailable()) {
        throw new ServiceUnavailableError(
          "Serviço de comunicações não está configurado",
          "BREVO_SERVICE_UNAVAILABLE"
        );
      }

      const accountInfo = await brevoService.getAccountInfo();

      logger.info("Teste de conectividade com a Brevo bem-sucedido", {
        email: accountInfo.email,
        company: accountInfo.companyName,
      });

      ApiResponse.success(
        res,
        {
          success: true,
          account: {
            email: accountInfo.email,
            firstName: accountInfo.firstName,
            lastName: accountInfo.lastName,
            company: accountInfo.companyName,
          },
        },
        {
          message: "Conexão com a API da Brevo estabelecida com sucesso",
          statusCode: 200,
        }
      );
    } catch (error) {
      logger.error("Falha no teste de conectividade com a Brevo", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro desconhecido na conexão com a Brevo";

      const errorCode =
        error instanceof ServiceUnavailableError
          ? error.errorCode
          : "CONNECTIVITY_FAILED";

      ApiResponse.error(res, "Falha na conectividade com a API da Brevo", {
        code: errorCode,
        statusCode: 503,
        meta: {
          error: errorMessage,
        },
      });
    }
  };

  /**
   * Envia um email
   * @route POST /api/communications/email
   */
  public sendEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      // Obtém os dados da requisição e adiciona o ID do usuário para auditoria
      const emailOptions: EmailOptions = {
        ...req.body,
        userId: req.user?.id,
      };

      const result = await emailService.sendEmail(emailOptions);

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error || "Falha no envio de email",
          result.errorCode || "EMAIL_SEND_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: "Email enviado com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error ? error.message : "Erro ao enviar email";

        ApiResponse.error(res, message, {
          code: "EMAIL_SEND_FAILED",
          statusCode: 503,
        });
      }
    }
  };

  /**
   * Envia um email usando um template
   * @route POST /api/communications/email/template
   */
  public sendTemplateEmail = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { templateId, to, params } = req.body;
      const options = { ...req.body.options, userId: req.user?.id };

      const result = await emailService.sendTemplateEmail(
        templateId,
        to,
        params,
        options
      );

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error || "Falha no envio de email com template",
          result.errorCode || "EMAIL_TEMPLATE_SEND_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: "Email com template enviado com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao enviar email com template";

        ApiResponse.error(res, message, {
          code: "EMAIL_TEMPLATE_SEND_FAILED",
          statusCode: 503,
        });
      }
    }
  };

  /**
   * Envia um SMS
   * @route POST /api/communications/sms
   */
  public sendSms = async (req: Request, res: Response): Promise<void> => {
    try {
      // Obtém os dados da requisição e adiciona o ID do usuário para auditoria
      const smsOptions: SmsOptions = {
        ...req.body,
        userId: req.user?.id,
      };

      const result = await smsService.sendSms(smsOptions);

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error || "Falha no envio de SMS",
          result.errorCode || "SMS_SEND_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: "SMS enviado com sucesso",
        statusCode: 200,
        meta: {
          remainingCredits: result.remainingCredits,
        },
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error ? error.message : "Erro ao enviar SMS";

        ApiResponse.error(res, message, {
          code: "SMS_SEND_FAILED",
          statusCode: 503,
        });
      }
    }
  };

  /**
   * Envia um SMS usando um template
   * @route POST /api/communications/sms/template
   */
  public sendTemplateSms = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { phoneNumber, templateContent, params } = req.body;
      const options = { ...req.body.options, userId: req.user?.id };

      const result = await smsService.sendTemplateSms(
        phoneNumber,
        templateContent,
        params,
        options
      );

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error || "Falha no envio de SMS com template",
          result.errorCode || "SMS_TEMPLATE_SEND_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: "SMS com template enviado com sucesso",
        statusCode: 200,
        meta: {
          remainingCredits: result.remainingCredits,
        },
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao enviar SMS com template";

        ApiResponse.error(res, message, {
          code: "SMS_TEMPLATE_SEND_FAILED",
          statusCode: 503,
        });
      }
    }
  };

  /**
   * Envia uma mensagem WhatsApp
   * @route POST /api/communications/whatsapp
   */
  public sendWhatsApp = async (req: Request, res: Response): Promise<void> => {
    try {
      // Obtém os dados da requisição e adiciona o ID do usuário para auditoria
      const whatsappOptions: WhatsAppOptions = {
        ...req.body,
        userId: req.user?.id,
      };

      const result = await whatsAppService.sendWhatsAppMessage(whatsappOptions);

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error || "Falha no envio de mensagem WhatsApp",
          result.errorCode || "WHATSAPP_SEND_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: "Mensagem WhatsApp enviada com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao enviar mensagem WhatsApp";

        ApiResponse.error(res, message, {
          code: "WHATSAPP_SEND_FAILED",
          statusCode: 503,
        });
      }
    }
  };

  /**
   * Envia uma mensagem WhatsApp usando um template
   * @route POST /api/communications/whatsapp/template
   */
  public sendWhatsAppTemplate = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { phoneNumber, templateId, params } = req.body;
      const options = { ...req.body.options, userId: req.user?.id };

      const result = await whatsAppService.sendWhatsAppTemplate(
        phoneNumber,
        templateId,
        params,
        options
      );

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error || "Falha no envio de mensagem WhatsApp com template",
          result.errorCode || "WHATSAPP_TEMPLATE_SEND_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: "Mensagem WhatsApp com template enviada com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao enviar mensagem WhatsApp com template";

        ApiResponse.error(res, message, {
          code: "WHATSAPP_TEMPLATE_SEND_FAILED",
          statusCode: 503,
        });
      }
    }
  };

  /**
   * Obtém a lista de templates WhatsApp disponíveis
   * @route GET /api/communications/whatsapp/templates
   */
  public getWhatsAppTemplates = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const result = await whatsAppService.getWhatsAppTemplates();

      if (!result.success) {
        throw new ServiceUnavailableError(
          result.error || "Falha ao obter templates WhatsApp",
          result.errorCode || "WHATSAPP_TEMPLATES_FAILED"
        );
      }

      ApiResponse.success(res, result, {
        message: "Templates WhatsApp obtidos com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        ApiResponse.error(res, error.message, {
          code: error.errorCode,
          statusCode: error.statusCode,
          meta: error.meta,
        });
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Erro ao obter templates WhatsApp";

        ApiResponse.error(res, message, {
          code: "WHATSAPP_TEMPLATES_FAILED",
          statusCode: 503,
        });
      }
    }
  };
}
