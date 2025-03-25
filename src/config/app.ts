import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import "express-async-errors";
import { morganMiddleware, errorLogger } from "./logger";
import { errorMiddleware } from "@/shared/middleware/error.middleware";
import { rateLimiterMiddleware } from "@/shared/middleware/rate-limiter";
import routes from "@/routes";

/**
 * Inicializa e configura a aplicação Express
 * @returns Aplicação Express configurada
 */
export function createApp(): Express {
  const app = express();

  // Middlewares para logging
  app.use(morganMiddleware());

  // Middleware para segurança
  app.use(helmet());

  // Middleware para CORS
  app.use(
    cors({
      origin: "*", // Em produção, defina os domínios permitidos
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Middleware para parsing de JSON
  app.use(express.json({ limit: "1mb" }));

  // Middleware para parsing de URL encoded
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Middleware para rate limiting
  app.use(rateLimiterMiddleware);

  // Healthcheck para verificar se a aplicação está funcionando
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Configura todas as rotas da aplicação
  app.use("/api", routes);

  // Middleware para tratamento de erros
  app.use(errorLogger);
  app.use(errorMiddleware);

  return app;
}
