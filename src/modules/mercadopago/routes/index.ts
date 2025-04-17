import { Router } from "express";
import courseRoutes from "./courses.routes";
import subscriberRoutes from "./subscriber.routes";
import webhookRoutes from "./webhook.routes";

/**
 * Configuração centralizada de rotas do módulo MercadoPago
 */
const router: Router = Router();

// Rotas para webhooks (sem autenticação)
router.use("/webhooks", webhookRoutes);

// Rotas para assinantes (requerem autenticação)
router.use("/subscriber", subscriberRoutes);

// Rotas para pagamentos de cursos (requerem autenticação)
router.use("/courses", courseRoutes);

export default router;
