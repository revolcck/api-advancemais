/**
 * Configuração central de rotas
 * Agrega todas as rotas dos diferentes módulos da aplicação
 */

import { Router } from "express";
import authRoutes from "@/modules/auth/routes/auth.routes";

// Cria um router principal
const router = Router();

// Rotas de autenticação
router.use("/auth", authRoutes);

export default router;
