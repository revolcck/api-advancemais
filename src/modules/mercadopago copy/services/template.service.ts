/**
 * Serviço para gerenciamento de templates HTML de email
 * @module modules/mercadopago/services/template.service
 */

import fs from "fs";
import path from "path";
import { logger } from "@/shared/utils/logger.utils";

/**
 * Tipos de templates disponíveis
 */
export enum EmailTemplateType {
  PURCHASE_CONFIRMATION = "purchase-confirmation.html",
  REFUND_NOTIFICATION = "refund-notification.html",
  SUBSCRIPTION_RENEWAL = "subscription-renewal.html",
  SUBSCRIPTION_CANCELLATION = "subscription-cancellation.html",
}

/**
 * Serviço para carregamento e processamento de templates de email
 */
export class TemplateService {
  private static instance: TemplateService;
  private templatesDir: string;
  private templateCache: Map<string, string> = new Map();

  /**
   * Construtor privado para implementação do Singleton
   */
  private constructor() {
    // Caminho para o diretório de templates
    this.templatesDir = path.join(__dirname, "..", "templates");
    this.loadTemplates();
  }

  /**
   * Obtém a instância única do serviço
   */
  public static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  /**
   * Carrega todos os templates para o cache
   */
  private loadTemplates(): void {
    try {
      // Verifica se o diretório existe
      if (!fs.existsSync(this.templatesDir)) {
        logger.error(
          `Diretório de templates não encontrado: ${this.templatesDir}`
        );
        return;
      }

      // Carrega os templates disponíveis
      for (const templateType of Object.values(EmailTemplateType)) {
        const templatePath = path.join(this.templatesDir, templateType);

        // Verifica se o arquivo existe
        if (fs.existsSync(templatePath)) {
          const templateContent = fs.readFileSync(templatePath, "utf8");
          this.templateCache.set(templateType, templateContent);
          logger.debug(`Template carregado: ${templateType}`);
        } else {
          logger.warn(`Template não encontrado: ${templateType}`);
        }
      }

      logger.info(`Templates carregados: ${this.templateCache.size}`);
    } catch (error) {
      logger.error("Erro ao carregar templates", error);
    }
  }

  /**
   * Obtém um template do cache
   * @param templateType Tipo do template
   * @returns Conteúdo do template ou null se não encontrado
   */
  public getTemplate(templateType: EmailTemplateType): string | null {
    return this.templateCache.get(templateType) || null;
  }

  /**
   * Processa um template substituindo as variáveis pelos valores
   * @param templateType Tipo do template
   * @param variables Variáveis para substituição
   * @returns Template processado ou null se ocorrer erro
   */
  public processTemplate(
    templateType: EmailTemplateType,
    variables: Record<string, any>
  ): string | null {
    try {
      const template = this.getTemplate(templateType);

      if (!template) {
        logger.error(`Template não encontrado: ${templateType}`);
        return null;
      }

      // Adiciona o ano atual como variável padrão
      const allVariables = {
        ...variables,
        currentYear: new Date().getFullYear(),
      };

      // Processa o template substituindo as variáveis
      let processedTemplate = template;

      // Substitui as variáveis simples ({{variableName}})
      for (const [key, value] of Object.entries(allVariables)) {
        if (value !== undefined && value !== null) {
          const regex = new RegExp(`{{${key}}}`, "g");
          processedTemplate = processedTemplate.replace(
            regex,
            value.toString()
          );
        }
      }

      // Processa as condicionais ({{#variableName}}...{{/variableName}})
      for (const [key, value] of Object.entries(allVariables)) {
        // Se o valor for falsy, remove o bloco condicional
        if (!value) {
          const conditionalRegex = new RegExp(
            `{{#${key}}}[\\s\\S]*?{{/${key}}}`,
            "g"
          );
          processedTemplate = processedTemplate.replace(conditionalRegex, "");
        } else {
          // Se o valor for truthy, mantém o conteúdo mas remove as tags condicionais
          const startTag = new RegExp(`{{#${key}}}`, "g");
          const endTag = new RegExp(`{{/${key}}}`, "g");
          processedTemplate = processedTemplate
            .replace(startTag, "")
            .replace(endTag, "");
        }
      }

      // Processa condições inversas ({{^variableName}}...{{/variableName}})
      for (const [key, value] of Object.entries(allVariables)) {
        // Se o valor for truthy, remove o bloco condicional
        if (value) {
          const conditionalRegex = new RegExp(
            `{{\\^${key}}}[\\s\\S]*?{{/${key}}}`,
            "g"
          );
          processedTemplate = processedTemplate.replace(conditionalRegex, "");
        } else {
          // Se o valor for falsy, mantém o conteúdo mas remove as tags condicionais
          const startTag = new RegExp(`{{\\^${key}}}`, "g");
          const endTag = new RegExp(`{{/${key}}}`, "g");
          processedTemplate = processedTemplate
            .replace(startTag, "")
            .replace(endTag, "");
        }
      }

      // Remove todas as variáveis não substituídas
      processedTemplate = processedTemplate.replace(/{{[^{}]+}}/g, "");

      return processedTemplate;
    } catch (error) {
      logger.error(`Erro ao processar template ${templateType}`, error);
      return null;
    }
  }

  /**
   * Recarrega um template específico do disco
   * @param templateType Tipo do template
   * @returns Verdadeiro se carregado com sucesso
   */
  public reloadTemplate(templateType: EmailTemplateType): boolean {
    try {
      const templatePath = path.join(this.templatesDir, templateType);

      if (fs.existsSync(templatePath)) {
        const templateContent = fs.readFileSync(templatePath, "utf8");
        this.templateCache.set(templateType, templateContent);
        logger.info(`Template recarregado: ${templateType}`);
        return true;
      } else {
        logger.warn(`Template não encontrado para recarga: ${templateType}`);
        return false;
      }
    } catch (error) {
      logger.error(`Erro ao recarregar template ${templateType}`, error);
      return false;
    }
  }

  /**
   * Recarrega todos os templates do disco
   */
  public reloadAllTemplates(): void {
    this.loadTemplates();
  }
}

// Exporta a instância do serviço
export const templateService = TemplateService.getInstance();
