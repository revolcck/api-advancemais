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
 * @route GET /heltz
 * @desc Verificação simplificada para kubernetes e serviços de monitoramento externos
 * @access Público
 */
router.get("/heltz", healthController.liveness.bind(healthController));

export default router;
