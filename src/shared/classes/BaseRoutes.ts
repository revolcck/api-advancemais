/**
 * Classe base para configuração de rotas
 * @module shared/classes/BaseRoutes
 *
 * Define uma classe abstrata que padroniza a forma como as rotas
 * são configuradas e registradas em diferentes módulos do sistema.
 */
import { Router, Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.utils";

/**
 * Classe abstrata que fornece uma estrutura comum para configurar rotas
 * em diferentes módulos da aplicação
 */
export abstract class BaseRoutes {
  /**
   * Router do Express associado a esta instância
   */
  protected router: Router;

  /**
   * Nome do módulo associado a estas rotas (para logging)
   */
  protected moduleName: string;

  /**
   * Construtor base
   * @param moduleName Nome do módulo para logging
   */
  constructor(moduleName: string) {
    this.router = Router();
    this.moduleName = moduleName;

    // Aplica middlewares comuns
    this.applyCommonMiddleware();

    // Configura rotas específicas (implementado por subclasses)
    this.configureRoutes();
  }

  /**
   * Aplica middlewares comuns a todas as rotas deste módulo
   */
  protected applyCommonMiddleware(): void {
    // Logger de requisições para o módulo
    this.router.use((req: Request, _res: Response, next: NextFunction) => {
      logger.debug(
        `Requisição ${this.moduleName}: ${req.method} ${req.originalUrl}`,
        {
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          userId: req.user?.id || "anonymous",
        }
      );
      next();
    });
  }

  /**
   * Configura as rotas específicas do módulo
   * Deve ser implementado por cada módulo
   */
  protected abstract configureRoutes(): void;

  /**
   * Retorna o router configurado
   */
  public getRouter(): Router {
    return this.router;
  }
}
