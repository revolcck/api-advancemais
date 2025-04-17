/**
 * Rotas para o módulo MercadoPago
 * Centraliza todas as operações relacionadas a pagamentos e assinaturas
 */
import { Router } from "express";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";
import courseRoutes from "./courses.routes";
import subscriberRoutes from "./subscriber.routes";
import webhookRoutes from "./webhook.routes";
import statusRoutes from "./status.routes";

const router: Router = Router();

// Rotas de status e configuração
router.use("/status", statusRoutes);

// Rotas para webhooks (sem autenticação - necessário para integrações)
router.use("/webhooks", webhookRoutes);

// Rotas para pagamentos de cursos (requerem autenticação)
router.use("/courses", courseRoutes);

// Rotas para assinantes (requerem autenticação)
router.use("/subscriber", subscriberRoutes);

export default router;
