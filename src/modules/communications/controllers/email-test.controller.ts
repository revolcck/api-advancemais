// src/modules/communications/controllers/email-test.controller.ts

import { Request, Response } from "express";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { emailService } from "../services/email.service";
import { brevoService } from "../services/brevo.service";

/**
 * Controlador para testes de configuração de email
 */
export class EmailTestController {
  /**
   * Envia um email de teste para verificar a configuração
   * @route POST /api/communications/test-email
   */
  public testEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { to, name } = req.body;

      if (!to) {
        ApiResponse.error(res, "Email de destino é obrigatório", {
          code: "EMAIL_RECIPIENT_REQUIRED",
          statusCode: 400,
        });
        return;
      }

      // Verifica a configuração da Brevo
      const breveConfigured = brevoService.isAvailable();

      // Tenta obter informações da conta para verificar conectividade
      let accountInfo = null;
      let accountConnected = false;

      if (breveConfigured) {
        try {
          accountInfo = await brevoService.getAccountInfo();
          accountConnected = true;
        } catch (error) {
          // Ignora erros, apenas registra status
          accountConnected = false;
        }
      }

      // Envia um email de teste
      const result = await emailService.sendEmail({
        subject: "Teste de configuração de email",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <h2 style="color: #3498db;">Teste de Email</h2>
            <p>Olá ${name || "usuário"},</p>
            <p>Este é um email de teste para verificar a configuração do sistema de emails.</p>
            <p>Se você está recebendo este email, significa que a configuração está funcionando corretamente!</p>
            <br>
            <p>Atenciosamente,<br>Equipe de Suporte</p>
          </div>
        `,
        to: to,
        toName: name || "Usuário",
      });

      ApiResponse.success(
        res,
        {
          emailSent: result.success,
          messageId: result.messageId,
          breveConfigured,
          accountConnected,
          accountInfo: accountConnected
            ? {
                email: accountInfo.email,
                firstName: accountInfo.firstName,
                lastName: accountInfo.lastName,
                company: accountInfo.companyName,
              }
            : null,
          error: result.success ? null : result.error,
        },
        {
          message: result.success
            ? "Email de teste enviado com sucesso"
            : "Falha ao enviar email de teste",
          statusCode: result.success ? 200 : 500,
        }
      );
    } catch (error) {
      ApiResponse.error(res, "Erro ao testar configuração de email", {
        code: "EMAIL_TEST_FAILED",
        statusCode: 500,
        meta: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  };

  /**
   * Verifica o status da configuração de email
   * @route GET /api/communications/email-status
   */
  public checkEmailStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Verifica se o serviço Brevo está configurado
      const breveConfigured = brevoService.isAvailable();

      // Tenta obter informações da conta para verificar conectividade
      let accountInfo = null;
      let accountConnected = false;

      if (breveConfigured) {
        try {
          accountInfo = await brevoService.getAccountInfo();
          accountConnected = true;
        } catch (error) {
          // Ignora erros, apenas registra status
          accountConnected = false;
        }
      }

      ApiResponse.success(
        res,
        {
          configured: breveConfigured,
          connected: accountConnected,
          accountInfo: accountConnected
            ? {
                email: accountInfo.email,
                firstName: accountInfo.firstName,
                lastName: accountInfo.lastName,
                company: accountInfo.companyName,
              }
            : null,
          apiKeyConfigured: !!process.env.BREVO_API_KEY,
        },
        {
          message: "Status da configuração de email verificado",
          statusCode: 200,
        }
      );
    } catch (error) {
      ApiResponse.error(res, "Erro ao verificar status de email", {
        code: "EMAIL_STATUS_CHECK_FAILED",
        statusCode: 500,
        meta: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  };
}
