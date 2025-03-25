import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/**
 * Schema de validação para as variáveis de ambiente
 * Garante que todas as variáveis necessárias estejam presentes e sejam do tipo esperado
 */
const envSchema = z.object({
  // Ambiente da aplicação
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("3000"),

  // Banco de dados
  DATABASE_URL: z.string(),

  // Redis
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.string().default("6379"),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default("1d"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // Rate Limit
  RATE_LIMIT_WINDOW_MS: z.string().default("900000"), // 15 minutos
  RATE_LIMIT_MAX: z.string().default("100"), // 100 requisições

  // Log
  LOG_FORMAT: z.string().default("combined"),
  LOG_DIR: z.string().default("logs"),
});

/**
 * Tenta validar as variáveis de ambiente
 * Em caso de erro, exibe quais variáveis estão faltando ou são inválidas
 */
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Variáveis de ambiente inválidas:");
  console.error(_env.error.format());
  throw new Error("Variáveis de ambiente inválidas");
}

/**
 * Objeto contendo todas as variáveis de ambiente validadas e tipadas
 */
export const env = {
  // Ambiente
  nodeEnv: _env.data.NODE_ENV,
  port: parseInt(_env.data.PORT, 10),
  isDevelopment: _env.data.NODE_ENV === "development",
  isProduction: _env.data.NODE_ENV === "production",
  isTest: _env.data.NODE_ENV === "test",

  // Database
  databaseUrl: _env.data.DATABASE_URL,

  // Redis
  redis: {
    host: _env.data.REDIS_HOST,
    port: parseInt(_env.data.REDIS_PORT, 10),
    password: _env.data.REDIS_PASSWORD,
  },

  // JWT
  jwt: {
    secret: _env.data.JWT_SECRET,
    expiresIn: _env.data.JWT_EXPIRES_IN,
    refreshExpiresIn: _env.data.JWT_REFRESH_EXPIRES_IN,
  },

  // Rate Limit
  rateLimit: {
    windowMs: parseInt(_env.data.RATE_LIMIT_WINDOW_MS, 10),
    max: parseInt(_env.data.RATE_LIMIT_MAX, 10),
  },

  // Log
  log: {
    format: _env.data.LOG_FORMAT,
    dir: _env.data.LOG_DIR,
  },
};
