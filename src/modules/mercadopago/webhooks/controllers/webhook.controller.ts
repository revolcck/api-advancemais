import { Request, Response } from "express";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { logger } from "@/shared/utils/logger.utils";
import { WebhookService } from "../services/webhook.service";
import { validateWebhookSignature } from "../../utils/mercadopago.util";
import { env } from "@/config/environment";
import { prisma } from "@/config/database";
import { PaginationUtils } from "@/shared/utils/pagination.utils";

/**
 * Controlador para endpoints de webhook do MercadoPago
 */
export class WebhookController {
  private webhookService: WebhookService;

  constructor() {
    this.webhookService = new WebhookService();
  }

  /**
   * Processa uma notificação recebida do MercadoPago
   * @route POST /api/mercadopago/webhooks
   */
  public handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info("Webhook do MercadoPago recebido", {
        type: req.query.type || req.body.type || req.body.action,
        id: req.query.id || req.body.id || req.body.data?.id,
      });

      // Valida assinatura do webhook em ambiente de produção
      if (env.isProduction && env.mercadoPago.webhookSecret) {
        const signature = req.headers["x-signature"] as string;

        if (
          !validateWebhookSignature(
            req.body,
            signature,
            env.mercadoPago.webhookSecret
          )
        ) {
          logger.warn("Assinatura do webhook inválida", {
            signature,
            body: JSON.stringify(req.body).substring(0, 100) + "...",
          });

          ApiResponse.error(res, "Assinatura inválida", {
            statusCode: 401,
            code: "INVALID_SIGNATURE",
          });
          return;
        }
      }

      // Processa a notificação
      const result = await this.webhookService.processWebhook(req.body);

      // Se o processamento foi bem-sucedido, retorna 200 OK
      if (result.success) {
        ApiResponse.success(
          res,
          { received: true },
          {
            message: result.message,
          }
        );
      } else {
        // Se houve problema no processamento, retorna 202 Accepted
        // para evitar que o MercadoPago reenvie a notificação
        res.status(202).json({
          status: "partial_processing",
          message: result.message,
        });
      }
    } catch (error) {
      logger.error("Erro ao processar webhook do MercadoPago", error);

      // Mesmo com erro, retornamos 202 para evitar reenvios
      res.status(202).json({
        status: "error",
        message: "Erro ao processar notificação",
      });
    }
  };

  /**
   * Endpoint para teste de webhooks
   * @route GET /api/mercadopago/webhooks/test
   */
  public testWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      // Apenas disponível em ambientes de desenvolvimento ou homologação
      if (env.isProduction) {
        ApiResponse.error(
          res,
          "Endpoint disponível apenas em ambiente de desenvolvimento ou homologação",
          {
            statusCode: 403,
            code: "FORBIDDEN",
          }
        );
        return;
      }

      ApiResponse.success(res, {
        message: "Endpoint de teste de webhook disponível",
        environment: env.nodeEnv,
        webhookUrl: `${env.appUrl}/api/mercadopago/webhooks`,
        currentTime: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Erro no endpoint de teste de webhook", error);
      throw error;
    }
  };

  /**
   * Consulta o histórico de webhooks recebidos
   * @route GET /api/mercadopago/webhooks/history
   */
  public getWebhookHistory = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Extrair e validar parâmetros de paginação e filtros
      const { page, limit, skip, sortOrder } =
        PaginationUtils.normalizePaginationParams({
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          sortBy: req.query.sortBy as string,
          sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
        });

      // Extrair filtros específicos
      const source = req.query.source as string;
      const eventType = req.query.eventType as string;
      const status = req.query.status as string;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      logger.info("Consultando histórico de webhooks", {
        page,
        limit,
        source,
        eventType,
        status,
        startDate,
        endDate,
      });

      // Construir filtros para consulta
      const filter: any = {};

      if (source) {
        filter.source = source;
      }

      if (eventType) {
        filter.eventType = eventType;
      }

      if (status) {
        filter.processStatus = status;
      }

      // Aplicar filtro de data se fornecido
      if (startDate || endDate) {
        filter.createdAt = {};

        if (startDate) {
          filter.createdAt.gte = startDate;
        }

        if (endDate) {
          filter.createdAt.lte = endDate;
        }
      }

      // Contar total de registros com os filtros aplicados
      const totalItems = await prisma.webhookNotification.count({
        where: filter,
      });

      // Buscar registros
      const webhooks = await prisma.webhookNotification.findMany({
        where: filter,
        orderBy: {
          createdAt: sortOrder,
        },
        skip,
        take: limit,
        select: {
          id: true,
          source: true,
          eventType: true,
          eventId: true,
          liveMode: true,
          processStatus: true,
          processedAt: true,
          error: true,
          createdAt: true,
          // Exclui rawData para não sobrecarregar a resposta
        },
      });

      // Calcular informações de paginação
      const totalPages = Math.ceil(totalItems / limit);

      // Retornar resposta paginada
      ApiResponse.paginated(res, webhooks, {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      });
    } catch (error) {
      logger.error("Erro ao consultar histórico de webhooks", error);
      throw error;
    }
  };
}
