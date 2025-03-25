import dotenv from "dotenv";
import * as joi from "joi";

dotenv.config();

/**
 * Schema de validação para as variáveis de ambiente
 * Garante que todas as variáveis necessárias estejam presentes e sejam do tipo esperado
 */
const envSchema = joi.object({
  // Ambiente da aplicação
  NODE_ENV: joi
    .string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: joi.string().default("3000"),

  // Banco de dados
  DATABASE_URL: joi.string().required(),

  // Redis
  REDIS_HOST: joi.string().default("localhost"),
  REDIS_PORT: joi.string().default("6379"),
  REDIS_PASSWORD: joi.string().allow("").optional(),

  // JWT
  JWT_SECRET: joi.string().required(),
  JWT_EXPIRES_IN: joi.string().default("1d"),
  JWT_REFRESH_EXPIRES_IN: joi.string().default("7d"),

  // Rate Limit
  RATE_LIMIT_WINDOW_MS: joi.string().default("900000"), // 15 minutos
  RATE_LIMIT_MAX: joi.string().default("100"), // 100 requisições

  // Log
  LOG_FORMAT: joi.string().default("combined"),
  LOG_DIR: joi.string().default("logs"),
});

/**
 * Tenta validar as variáveis de ambiente
 * Em caso de erro, exibe quais variáveis estão faltando ou são inválidas
 */
const { error, value: _env } = envSchema.validate(process.env, {
  abortEarly: false,
  allowUnknown: true,
});

if (error) {
  console.error("❌ Variáveis de ambiente inválidas:");
  console.error(error.details.map((detail) => detail.message).join("\n"));
  throw new Error("Variáveis de ambiente inválidas");
}

/**
 * Objeto contendo todas as variáveis de ambiente validadas e tipadas
 */
export const env = {
  // Ambiente
  nodeEnv: _env.NODE_ENV,
  port: parseInt(_env.PORT, 10),
  isDevelopment: _env.NODE_ENV === "development",
  isProduction: _env.NODE_ENV === "production",
  isTest: _env.NODE_ENV === "test",

  // Database
  databaseUrl: _env.DATABASE_URL,

  // Redis
  redis: {
    host: _env.REDIS_HOST,
    port: parseInt(_env.REDIS_PORT, 10),
    password: _env.REDIS_PASSWORD,
  },

  // JWT
  jwt: {
    secret: _env.JWT_SECRET,
    expiresIn: _env.JWT_EXPIRES_IN,
    refreshExpiresIn: _env.JWT_REFRESH_EXPIRES_IN,
  },

  // Rate Limit
  rateLimit: {
    windowMs: parseInt(_env.RATE_LIMIT_WINDOW_MS, 10),
    max: parseInt(_env.RATE_LIMIT_MAX, 10),
  },

  // Log
  log: {
    format: _env.LOG_FORMAT,
    dir: _env.LOG_DIR,
  },
};
