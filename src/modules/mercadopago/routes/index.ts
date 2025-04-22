/**
 * Rotas para o módulo MercadoPago
 * @module modules/mercadopago/routes
 *
 * Este arquivo centraliza todas as rotas relacionadas a pagamentos e
 * assinaturas via MercadoPago e aplica middlewares comuns.
 */
import { Router, Request, Response, NextFunction } from "express";
import { logger } from "@/shared/utils/logger.utils";
import { env } from "@/config/environment";
import { ApiResponse } from "@/shared/utils/api-response.utils";

// Importação de sub-rotas
import courseRoutes from "./courses.routes";
import subscriberRoutes from "./subscriber.routes"; // Rota legacy - será substituída
import subscriptionRoutes from "../subscription/routes"; // Nova implementação de assinaturas
import webhookRoutes from "./webhook.routes";
import statusRoutes from "./status.routes";

// Importação de constantes
import { MERCADOPAGO_ROUTES } from "../constants/routes.constants";

// Inicializa o router principal
const router: Router = Router();

/**
 * Middleware para logging de todas as requisições do módulo MercadoPago
 */
const logMercadoPagoRequest = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  logger.debug(`Requisição MercadoPago: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    userId: req.user?.id || "anonymous",
  });
  next();
};

/**
 * Middleware para verificar se o módulo MercadoPago está habilitado
 */
const checkMercadoPagoEnabled = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  const mpEnabled =
    env.mercadoPago.accessToken &&
    (env.mercadoPago.accessToken.length > 10 ||
      (env.mercadoPago.prodEnabled &&
        env.mercadoPago.prodAccessToken.length > 10));

  if (!mpEnabled) {
    ApiResponse.error(
      res,
      "Serviço de pagamento indisponível. Tente novamente mais tarde.",
      {
        statusCode: 503,
        code: "SERVICE_UNAVAILABLE",
      }
    );
    return; // Adicionado return para evitar que o código continue
  }

  next();
};

// Aplica o middleware de logging a todas as rotas
router.use(logMercadoPagoRequest);

// Aplica o middleware de verificação em todas as rotas exceto webhooks
// Os webhooks precisam sempre funcionar, mesmo quando o módulo está "desabilitado"
router.use(
  new RegExp(`^(?!${MERCADOPAGO_ROUTES.WEBHOOKS}).*$`),
  checkMercadoPagoEnabled
);

/**
 * @route /api/mercadopago/status
 * @desc Rotas de status e configuração do MercadoPago
 * @access Misto (algumas públicas, outras privadas)
 */
router.use(MERCADOPAGO_ROUTES.STATUS, statusRoutes);

/**
 * @route /api/mercadopago/webhooks
 * @desc Rotas para webhooks e processamento de notificações do MercadoPago
 * @access Público (para integrações) e Privado (para admins)
 */
router.use(MERCADOPAGO_ROUTES.WEBHOOKS, webhookRoutes);

/**
 * @route /api/mercadopago/courses
 * @desc Rotas para pagamentos de cursos via MercadoPago
 * @access Privado (requer autenticação)
 */
router.use(MERCADOPAGO_ROUTES.COURSES, courseRoutes);

/**
 * @route /api/mercadopago/subscriber
 * @desc Rotas legacy para gerenciamento de assinaturas via MercadoPago
 * @deprecated Use /api/mercadopago/subscription em vez disso
 * @access Privado (requer autenticação)
 */
router.use(MERCADOPAGO_ROUTES.SUBSCRIBER, subscriberRoutes);

/**
 * @route /api/mercadopago/subscription
 * @desc Novas rotas para gerenciamento de assinaturas e planos via MercadoPago
 * @access Privado (requer autenticação)
 */
router.use("/subscription", subscriptionRoutes);

/**
 * @route GET /api/mercadopago/health
 * @desc Endpoint para verificação rápida da saúde do módulo
 * @access Público
 */
router.get(MERCADOPAGO_ROUTES.HEALTH, (req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      status: "success",
      mode: env.mercadoPago.prodEnabled ? "production" : "sandbox",
      timestamp: new Date().toISOString(),
    },
    {
      message: "MercadoPago service is running",
    }
  );
});
