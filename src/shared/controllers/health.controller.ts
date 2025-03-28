import { Request, Response } from "express";
import { HealthService } from "@/shared/services/health.service";
import { logger } from "@/shared/utils/logger.utils";

/**
 * Controlador responsável pelas rotas de health check da aplicação
 */
export class HealthController {
  /**
   * Verifica e retorna o status de saúde detalhado da aplicação
   * Usado para monitoramento interno e verificações mais detalhadas
   * @route GET /api/health
   */
  public async check(req: Request, res: Response): Promise<void> {
    try {
      const healthResult = await HealthService.checkHealth();

      // Status HTTP baseado no status geral
      const httpStatus = this.mapStatusToHttpCode(healthResult.status);

      res.status(httpStatus).json(healthResult);
    } catch (error) {
      logger.error("Erro ao executar health check completo", error);

      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro ao verificar a saúde dos serviços",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Endpoint simplificado para probes de Kubernetes e serviços como Render
   * Retorna resposta mínima com foco em performance para health checks frequentes
   * @route GET /api/heltz
   */
  public async liveness(req: Request, res: Response): Promise<void> {
    try {
      const healthResult = await HealthService.checkHealth();

      // Status HTTP baseado no status geral
      const httpStatus = this.mapStatusToHttpCode(healthResult.status);

      // Versão simplificada da resposta para health checks frequentes
      const response = {
        status: healthResult.status,
        timestamp: healthResult.timestamp,
      };

      res.status(httpStatus).json(response);
    } catch (error) {
      logger.error("Erro ao executar health check (liveness)", error);

      res.status(500).json({
        status: "error",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Mapeia o status de saúde para o código HTTP apropriado
   * @param status Status de saúde da aplicação
   * @returns Código HTTP correspondente
   */
  private mapStatusToHttpCode(status: string): number {
    switch (status) {
      case "healthy":
        return 200; // OK
      case "degraded":
        return 200; // OK, mas com serviços não-críticos degradados
      case "unhealthy":
        return 503; // Service Unavailable
      default:
        return 500; // Internal Server Error
    }
  }
}
