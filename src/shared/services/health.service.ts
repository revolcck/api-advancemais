import { db } from "@/config/database";
import { redisService } from "@/config/redis";
import { env } from "@/config/environment";
import { logger } from "@/shared/utils/logger.utils";

/**
 * Interface para resultado de health check de serviços
 */
export interface ServiceStatus {
  isHealthy: boolean;
  details: Record<string, any>;
}

/**
 * Interface para resultado do health check completo
 */
export interface HealthCheckResult {
  status: "healthy" | "unhealthy" | "degraded";
  uptime: number;
  environment: string;
  version: string;
  timestamp: string;
  services: {
    [key: string]: ServiceStatus;
  };
}

/**
 * Serviço para verificação de saúde da aplicação e seus componentes
 * Permite monitorar o status de cada serviço dependente
 */
export class HealthService {
  /**
   * Realiza verificação completa de saúde da aplicação
   * @returns Resultado detalhado do health check
   */
  public static async checkHealth(): Promise<HealthCheckResult> {
    const services: Record<string, ServiceStatus> = {};

    // Verifica banco de dados
    services.database = await this.checkDatabaseHealth();

    // Verifica Redis se estiver habilitado
    services.redis = await this.checkRedisHealth();

    // Determina o status geral com base nos serviços essenciais
    const overallStatus = this.determineOverallStatus(services);

    // Log do resultado
    this.logHealthCheckResult(overallStatus, services);

    return {
      status: overallStatus,
      uptime: process.uptime(),
      environment: env.nodeEnv,
      version: this.getApplicationVersion(),
      timestamp: new Date().toISOString(),
      services: services, // Agora o tipo é compatível
    };
  }

  /**
   * Verifica a saúde do banco de dados
   * @returns Status do banco de dados
   */
  private static async checkDatabaseHealth(): Promise<ServiceStatus> {
    try {
      const dbHealthCheck = await db.healthCheck();

      return {
        isHealthy: dbHealthCheck.status === "ok",
        details: {
          responseTimeMs: dbHealthCheck.responseTime,
          connections: dbHealthCheck.connections,
        },
      };
    } catch (error) {
      logger.error("Erro ao verificar saúde do banco de dados", error);

      return {
        isHealthy: false,
        details: {
          error: error instanceof Error ? error.message : "Erro desconhecido",
        },
      };
    }
  }

  /**
   * Verifica a saúde do Redis
   * @returns Status do Redis
   */
  private static async checkRedisHealth(): Promise<ServiceStatus> {
    // Se o Redis não estiver habilitado, retorna como não crítico
    if (!env.redis.enabled) {
      return {
        isHealthy: true,
        details: {
          status: "disabled",
          message: "Redis não está habilitado na configuração atual",
        },
      };
    }

    try {
      const isConnected = redisService.isConnected();

      return {
        isHealthy: isConnected,
        details: {
          status: isConnected ? "connected" : "disconnected",
          host: env.redis.host,
          port: env.redis.port,
        },
      };
    } catch (error) {
      logger.error("Erro ao verificar saúde do Redis", error);

      return {
        isHealthy: false,
        details: {
          error: error instanceof Error ? error.message : "Erro desconhecido",
        },
      };
    }
  }

  /**
   * Determina o status geral da aplicação com base nos serviços
   * @param services Resultados dos checks de serviços individuais
   * @returns Status geral da aplicação
   */
  private static determineOverallStatus(
    services: Record<string, ServiceStatus>
  ): "healthy" | "unhealthy" | "degraded" {
    // Serviços críticos que precisam estar saudáveis
    const criticalServices = ["database"];

    // Verifica se algum serviço crítico está indisponível
    const hasCriticalFailure = criticalServices.some(
      (service) => services[service] && !services[service].isHealthy
    );

    if (hasCriticalFailure) {
      return "unhealthy";
    }

    // Verifica se algum serviço não-crítico está indisponível
    const hasNonCriticalFailure = Object.keys(services).some(
      (service) =>
        !criticalServices.includes(service) && !services[service].isHealthy
    );

    if (hasNonCriticalFailure) {
      return "degraded";
    }

    return "healthy";
  }

  /**
   * Obtém a versão atual da aplicação
   * @returns Versão da aplicação
   */
  private static getApplicationVersion(): string {
    try {
      // Tenta obter a versão do ambiente primeiro
      if (process.env.npm_package_version) {
        return process.env.npm_package_version;
      }

      // Se não disponível, carrega do package.json
      const packageJson = require("../../../package.json");
      return packageJson.version;
    } catch (error) {
      logger.warn("Não foi possível determinar a versão da aplicação", error);
      return "unknown";
    }
  }

  /**
   * Registra o resultado do health check nos logs
   * @param status Status geral da aplicação
   * @param services Status dos serviços individuais
   */
  private static logHealthCheckResult(
    status: string,
    services: Record<string, ServiceStatus>
  ): void {
    const logLevel = status === "healthy" ? "info" : "warn";

    // Simplifica os detalhes para o log
    const servicesStatus = Object.entries(services).reduce(
      (acc, [name, service]) => {
        acc[name] = service.isHealthy;
        return acc;
      },
      {} as Record<string, boolean>
    );

    logger[logLevel](`Health check: ${status}`, {
      services: servicesStatus,
      environment: env.nodeEnv,
    });
  }
}
