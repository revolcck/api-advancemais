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

/**
 * Controlador para operações de comunicação (e-mail, SMS, WhatsApp)
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
      const accountInfo = await brevoService.getAccountInfo();

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

      // Extrair a mensagem de erro com segurança de tipo
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro desconhecido na conexão com a Brevo";

      ApiResponse.error(res, "Falha na conectividade com a API da Brevo", {
        code: "CONNECTIVITY_FAILED",
        statusCode: 503,
        meta: {
          error: errorMessage,
        },
      });
    }
  };

  /**
   * Envia um e-mail
   * @route POST /api/communications/email
   */
  public sendEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const emailOptions: EmailOptions = req.body;

      const result = await emailService.sendEmail(emailOptions);

      ApiResponse.success(res, result, {
        message: "E-mail enviado com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      // O serviço já loga os erros, então apenas passamos adiante
      throw error;
    }
  };

  /**
   * Envia um e-mail usando um template
   * @route POST /api/communications/email/template
   */
  public sendTemplateEmail = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { templateId, to, params, options } = req.body;

      const result = await emailService.sendTemplateEmail(
        templateId,
        to,
        params,
        options
      );

      ApiResponse.success(res, result, {
        message: "E-mail com template enviado com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      // O serviço já loga os erros, então apenas passamos adiante
      throw error;
    }
  };

  /**
   * Envia um SMS
   * @route POST /api/communications/sms
   */
  public sendSms = async (req: Request, res: Response): Promise<void> => {
    try {
      const smsOptions: SmsOptions = req.body;

      const result = await smsService.sendSms(smsOptions);

      ApiResponse.success(res, result, {
        message: "SMS enviado com sucesso",
        statusCode: 200,
        meta: {
          remainingCredits: result.remainingCredits,
        },
      });
    } catch (error) {
      // O serviço já loga os erros, então apenas passamos adiante
      throw error;
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
      const { phoneNumber, templateContent, params, options } = req.body;

      const result = await smsService.sendTemplateSms(
        phoneNumber,
        templateContent,
        params,
        options
      );

      ApiResponse.success(res, result, {
        message: "SMS com template enviado com sucesso",
        statusCode: 200,
        meta: {
          remainingCredits: result.remainingCredits,
        },
      });
    } catch (error) {
      // O serviço já loga os erros, então apenas passamos adiante
      throw error;
    }
  };

  /**
   * Envia uma mensagem WhatsApp
   * @route POST /api/communications/whatsapp
   */
  public sendWhatsApp = async (req: Request, res: Response): Promise<void> => {
    try {
      const whatsappOptions: WhatsAppOptions = req.body;

      const result = await whatsAppService.sendWhatsAppMessage(whatsappOptions);

      ApiResponse.success(res, result, {
        message: "Mensagem WhatsApp enviada com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      // O serviço já loga os erros, então apenas passamos adiante
      throw error;
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
      const { phoneNumber, templateId, params, options } = req.body;

      const result = await whatsAppService.sendWhatsAppTemplate(
        phoneNumber,
        templateId,
        params,
        options
      );

      ApiResponse.success(res, result, {
        message: "Mensagem WhatsApp com template enviada com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      // O serviço já loga os erros, então apenas passamos adiante
      throw error;
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
      const templates = await whatsAppService.getWhatsAppTemplates();

      ApiResponse.success(res, templates, {
        message: "Templates WhatsApp obtidos com sucesso",
        statusCode: 200,
      });
    } catch (error) {
      // O serviço já loga os erros, então apenas passamos adiante
      throw error;
    }
  };
}
