/**
 * Serviço para configuração e documentação de rotas
 * @module shared/services/route
 *
 * Fornece utilitários para registrar, documentar e validar rotas
 * de forma padronizada em toda a aplicação.
 */
import { Request, Response, NextFunction } from "express";
import { RouteModule } from "../types/routes.types";
import { logger } from "../utils/logger.utils";

/**
 * Serviço para gerenciamento de rotas
 */
export class RouteService {
  /**
   * Coleção de módulos de rotas registrados
   */
  private static modules: Map<string, RouteModule> = new Map();

  /**
   * Registra um módulo de rotas no sistema
   *
   * @param module Configuração do módulo
   */
  public static registerModule(module: RouteModule): void {
    this.modules.set(module.name, module);
    logger.debug(`Módulo de rotas registrado: ${module.name}`, {
      basePath: module.basePath,
      routeCount: module.routes.length,
    });
  }

  /**
   * Obtém todos os módulos de rotas registrados
   *
   * @returns Lista de módulos registrados
   */
  public static getModules(): RouteModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Cria um middleware para logging de rotas
   *
   * @param moduleName Nome do módulo para identificação no log
   * @returns Middleware de Express configurado
   */
  public static createLoggerMiddleware(
    moduleName: string
  ): (req: Request, _res: Response, next: NextFunction) => void {
    return (req: Request, _res: Response, next: NextFunction): void => {
      logger.debug(
        `Requisição ${moduleName}: ${req.method} ${req.originalUrl}`,
        {
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          userId: req.user?.id || "anonymous",
        }
      );
      next();
    };
  }

  /**
   * Gera documentação das rotas no formato adequado para OpenAPI/Swagger
   *
   * @returns Objeto com definições de rotas para documentação
   */
  public static generateApiDocs(): Record<string, any> {
    const paths: Record<string, any> = {};

    // Itera sobre cada módulo e suas rotas
    this.modules.forEach((module) => {
      module.routes.forEach((route) => {
        const fullPath = `${module.basePath}${route.path}`;

        // Inicializa path se não existir
        if (!paths[fullPath]) {
          paths[fullPath] = {};
        }

        // Adiciona método HTTP
        paths[fullPath][route.method.toLowerCase()] = {
          tags: route.tags || [module.name],
          summary: route.description,
          security: route.access !== "public" ? [{ bearerAuth: [] }] : [],
          // Outras propriedades de documentação podem ser adicionadas aqui
        };
      });
    });

    return paths;
  }
}
