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

      // Log para depuração
      logger.info(`Tentando enviar email de boas-vindas para ${email}`, {
        params,
        templatePath: path.join(__dirname, "../templates/welcome-email.html"),
      });

      // Verifica se o template existe
      const templatePath = path.join(
        __dirname,
        "../templates/welcome-email.html"
      );

      if (!fs.existsSync(templatePath)) {
        logger.error(`Template de email não encontrado: ${templatePath}`);

        // Usar conteúdo HTML alternativo simplificado se o template não existir
        return this.sendWelcomeEmailAlternative(email, params);
      }

      // Carrega o template do email
      let htmlContent = fs.readFileSync(templatePath, "utf8");

      // Substitui os parâmetros no template
      Object.entries(params).forEach(([key, value]) => {
        htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, "g"), value);
      });

      // Envia o email
      const result = await emailService.sendEmail({
        subject: `Bem-vindo(a) ${params.name} à nossa plataforma!`,
        htmlContent,
        to: email,
        toName: params.name,
      });

      if (result.success) {
        logger.info(`Email de boas-vindas enviado com sucesso para ${email}`, {
          messageId: result.messageId,
        });
        return true;
      } else {
        logger.error(`Falha ao enviar email de boas-vindas: ${result.error}`, {
          email,
          error: result.error,
          errorCode: result.errorCode,
        });

        // Tenta método alternativo se o envio falhar
        return this.sendWelcomeEmailAlternative(email, params);
      }
    } catch (error) {
      logger.error(`Erro ao enviar email de boas-vindas`, {
        email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Tenta método alternativo em caso de erro
      return this.sendWelcomeEmailAlternative(email, params);
    }
  }

  /**
   * Método alternativo para envio de email caso o método principal falhe
   * Usa template simplificado e direto no código
   */
  private static async sendWelcomeEmailAlternative(
    email: string,
    params: {
      name: string;
      login: string;
      matricula: string;
      loginUrl?: string;
    }
  ): Promise<boolean> {
    try {
      logger.info(
        `Tentando enviar email de boas-vindas (método alternativo) para ${email}`
      );

      // Template HTML simplificado embutido no código
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Bem-vindo à nossa plataforma!</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #3498db; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .button { display: inline-block; background-color: #3498db; color: white; 
                        text-decoration: none; padding: 10px 20px; border-radius: 4px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Bem-vindo(a), ${params.name}!</h1>
              </div>
              <div class="content">
                <p>Olá <strong>${params.name}</strong>,</p>
                <p>Estamos muito felizes em ter você como parte da nossa comunidade!</p>
                <p>Sua conta foi criada com sucesso e você já pode começar a usar nossos serviços.</p>
                <p>Suas informações de acesso:</p>
                <ul>
                  <li><strong>Login:</strong> ${params.login}</li>
                  <li><strong>Matrícula:</strong> ${params.matricula}</li>
                </ul>
                <div style="text-align: center">
                  <a href="${params.loginUrl}" style="background-color: #3498db; color: white; 
                    text-decoration: none; padding: 10px 20px; border-radius: 4px; margin: 15px 0; display: inline-block;">
                    Acessar minha conta
                  </a>
                </div>
                <p>Se você tiver alguma dúvida, não hesite em entrar em contato conosco.</p>
                <p>Atenciosamente,<br />Equipe da Plataforma</p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Envia o email com o template alternativo
      const result = await emailService.sendEmail({
        subject: `Bem-vindo(a) ${params.name} à nossa plataforma!`,
        htmlContent,
        to: email,
        toName: params.name,
      });

      if (result.success) {
        logger.info(
          `Email de boas-vindas (método alternativo) enviado com sucesso para ${email}`
        );
        return true;
      } else {
        logger.error(
          `Falha ao enviar email de boas-vindas (método alternativo): ${result.error}`,
          {
            email,
            error: result.error,
          }
        );
        return false;
      }
    } catch (error) {
      logger.error(`Erro ao enviar email de boas-vindas (método alternativo)`, {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
