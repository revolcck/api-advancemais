/**
 * Rotas para o módulo MercadoPago
 * Centraliza todas as operações relacionadas a pagamentos e assinaturas
 * @module modules/mercadopago/routes
 */
import { Router, Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";
import courseRoutes from "./courses.routes";
import subscriberRoutes from "./subscriber.routes";
import webhookRoutes from "./webhook.routes";
import statusRoutes from "./status.routes";
import { logger } from "@/shared/utils/logger.utils";
import { env } from "@/config/environment";

const router: Router = Router();

// Middleware para logging de todas as requisições do módulo MercadoPago
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

// Verifica se o módulo MercadoPago está habilitado
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
    return res.status(503).json({
      status: "error",
      message: "Serviço de pagamento indisponível. Tente novamente mais tarde.",
      code: "SERVICE_UNAVAILABLE",
    });
  }

  next();
};

// Aplica o middleware de logging a todas as rotas
router.use(logMercadoPagoRequest);

// Aplica o middleware de verificação em todas as rotas exceto webhooks
// Os webhooks precisam sempre funcionar, mesmo quando o módulo está "desabilitado"
router.use(/^(?!\/webhooks).*$/, checkMercadoPagoEnabled);

/**
 * @route /api/mercadopago/status
 * @desc Rotas de status e configuração do MercadoPago
 * @access Misto (algumas públicas, outras privadas)
 */
router.use("/status", statusRoutes);

/**
 * @route /api/mercadopago/webhooks
 * @desc Rotas para webhooks e processamento de notificações do MercadoPago
 * @access Público (para integrações) e Privado (para admins)
 */
router.use("/webhooks", webhookRoutes);

/**
 * @route /api/mercadopago/courses
 * @desc Rotas para pagamentos de cursos via MercadoPago
 * @access Privado (requer autenticação)
 */
router.use("/courses", courseRoutes);

/**
 * @route /api/mercadopago/subscriber
 * @desc Rotas para gerenciamento de assinaturas via MercadoPago
 * @access Privado (requer autenticação)
 */
router.use("/subscriber", subscriberRoutes);

/**
 * @route GET /api/mercadopago/health
 * @desc Endpoint para verificação rápida da saúde do módulo
 * @access Público
 */
router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "MercadoPago service is running",
    mode: env.mercadoPago.prodEnabled ? "production" : "sandbox",
    timestamp: new Date().toISOString(),
  });
});

export default router;
