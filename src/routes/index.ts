import { Router } from "express";
import authRoutes from "@/modules/auth/routes";
import healthRoutes from "@/shared/routes/health.routes";
import communicationsRoutes from "@/modules/communications/routes";
import mercadoPagoRoutes from "@/modules/mercadopago/routes";
import subscriptionRoutes from "@/modules/subscription/routes";

const router: Router = Router();

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

// Rotas do Mercado Pago (API core)
router.use("/mercadopago", mercadoPagoRoutes);

// Rotas de assinaturas (integração com mercadopago para assinaturas)
router.use("/subscription", subscriptionRoutes);

export default router;
