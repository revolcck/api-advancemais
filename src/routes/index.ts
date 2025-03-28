import { Router } from "express";
import authRoutes from "@/modules/auth/routes/auth.routes";
import healthRoutes from "@/shared/routes/health.routes";
import communicationsRoutes from "@/modules/communications/routes";

const router: Router = Router();

/**
 * Configura as rotas de cada módulo com seus prefixos correspondentes
 */

// Rotas de monitoramento e saúde
router.use("/health", healthRoutes);

// Rota de compatibility para o Render e outros serviços que esperam /heltz na raiz
router.use("/heltz", (req, res, next) => {
  req.url = "/";
  return healthRoutes(req, res, next);
});

// Rotas de autenticação
router.use("/auth", authRoutes);

// Rotas de comunicações (e-mail, SMS, WhatsApp)
router.use("/communications", communicationsRoutes);

export default router;
