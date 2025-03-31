// src/modules/auth/services/email-service.ts

import fs from "fs";
import path from "path";
import { logger } from "@/shared/utils/logger.utils";
import { emailService } from "@/modules/communications/services/email.service";
import { env } from "@/config/environment";

/**
 * Serviço para gerenciar emails relacionados à autenticação
 */
export class AuthEmailService {
  /**
   * Envia email de boas-vindas para um novo usuário
   *
   * @param email Email do destinatário
   * @param params Parâmetros para o template
   * @returns Resultado do envio
   */
  public static async sendWelcomeEmail(
    email: string,
    params: {
      name: string;
      login: string;
      matricula: string;
      loginUrl?: string;
    }
  ): Promise<boolean> {
    try {
      // Define URL de login padrão se não informada
      if (!params.loginUrl) {
        params.loginUrl = `${env.frontendUrl || "http://localhost:3000"}/login`;
      }

      // Carrega o template do email
      const templatePath = path.join(
        __dirname,
        "../templates/welcome-email.html"
      );
      let htmlContent = fs.readFileSync(templatePath, "utf8");

      // Substitui os parâmetros no template
      Object.entries(params).forEach(([key, value]) => {
        htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, "g"), value);
      });

      // Envia o email
      const result = await emailService.sendEmail({
        subject: "Bem-vindo à nossa plataforma!",
        htmlContent,
        to: email,
        toName: params.name,
      });

      if (result.success) {
        logger.info(`Email de boas-vindas enviado com sucesso para ${email}`);
        return true;
      } else {
        logger.error(`Falha ao enviar email de boas-vindas: ${result.error}`, {
          email,
          error: result.error,
        });
        return false;
      }
    } catch (error) {
      logger.error(`Erro ao enviar email de boas-vindas`, {
        email,
        error,
      });
      return false;
    }
  }
}
