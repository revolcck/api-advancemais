import { Router } from "express";
import { HealthController } from "@/shared/controllers/health.controller";

const router: Router = Router();
const healthController = new HealthController();

/**
 * @route GET /health
 * @desc Verificação detalhada de saúde de todos os serviços
 * @access Público
 */
router.get("/", healthController.check.bind(healthController));

/**
 * @route GET /health/liveness
 * @desc Verificação simplificada para kubernetes e serviços de monitoramento externos
 * @access Público
 */
router.get("/liveness", healthController.liveness.bind(healthController));

/**
 * @route GET /heltz
 * @desc Rota de compatibilidade especial para o Render - responde com 200 para health checks
 * @access Público
 */
router.get("/heltz", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "api-advancemais",
    message: "Serviço disponível",
  });
});

export default router;
