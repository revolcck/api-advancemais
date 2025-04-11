import dotenv from "dotenv";
import * as joi from "joi";
import path from "path";

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Interface para tipagem do objeto de ambiente
 */
interface Environment {
  // Ambiente
  nodeEnv: "development" | "production" | "test";
  port: number;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;

  // Nome da aplicação
  appName: string;

  // URL da aplicação frontend
  frontendUrl: string;

  // Domínio da aplicação
  appUrl: string;
  allowedOrigins: string[];

  // Database
  databaseUrl: string;
  databasePoolMin: number;
  databasePoolMax: number;

  // Redis
  redis: {
    host: string;
    port: number;
    password: string | null;
    enabled: boolean;
  };

  // JWT
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    issuer: string;
    audience: string;
  };

  // Rate Limit
  rateLimit: {
    windowMs: number;
    max: number;
    standardHeaders: boolean;
    legacyHeaders: boolean;
  };

  // Log
  log: {
    format: string;
    dir: string;
    level: string;
  };

  // Segurança
  security: {
    bcryptSaltRounds: number;
    csrfProtection: boolean;
    sessionSecret: string | null;
  };

  // Brevo API Configuration
  brevo: {
    apiKey: string;
    senderEmail: string;
    senderName: string;
    smsSender: string;
  };

  // Mercado Pago
  mercadoPago: {
    subscription: {
      testEnabled: boolean;
      publicKey: string;
      accessToken: string;
      clientId: string;
      clientSecret: string;
      webhookSecret: string;
      // Credenciais de produção
      prodPublicKey: string;
      prodAccessToken: string;
      prodClientId: string;
      prodClientSecret: string;
      prodWebhookSecret: string;
      prodEnabled: boolean;
    };
    checkout: {
      testEnabled: boolean;
      publicKey: string;
      accessToken: string;
      clientId: string;
      clientSecret: string;
      webhookSecret: string;
      // Credenciais de produção
      prodPublicKey: string;
      prodAccessToken: string;
      prodClientId: string;
      prodClientSecret: string;
      prodWebhookSecret: string;
      prodEnabled: boolean;
    };
    integratorId: string;
    platformId: string;
    integrator: string;
    enabled: boolean;
  };
}

/**
 * Schema de validação para as variáveis de ambiente
 * Garante que todas as variáveis necessárias estejam presentes e sejam do tipo esperado
 */
const envSchema = joi
  .object({
    // Ambiente da aplicação
    NODE_ENV: joi
      .string()
      .valid("development", "production", "test")
      .default("development"),
    PORT: joi.number().default(3000),

    // Nome da aplicação
    APP_NAME: joi.string().default("api-projeto"), // Validação adicionada

    // URL e origens permitidas
    APP_URL: joi.string().uri().default("http://localhost:3000"),
    ALLOWED_ORIGINS: joi.string().default("*"),

    // Frontend URL
    FRONTEND_URL: joi.string().uri().default("http://localhost:3000"),

    // Banco de dados
    DATABASE_URL: joi.string().required(),
    DATABASE_POOL_MIN: joi.number().min(1).default(2),
    DATABASE_POOL_MAX: joi.number().min(1).default(10),

    // Redis
    REDIS_HOST: joi.string().default("localhost"),
    REDIS_PORT: joi.number().default(6379),
    REDIS_PASSWORD: joi.string().allow("").allow(null).default(""),
    REDIS_ENABLED: joi.boolean().default(true),

    // JWT
    JWT_SECRET: joi.string().min(32).required(),
    JWT_EXPIRES_IN: joi.string().default("1h"),
    JWT_REFRESH_EXPIRES_IN: joi.string().default("7d"),
    JWT_ISSUER: joi.string().default("api-projeto"),
    JWT_AUDIENCE: joi.string().default("api-clients"),

    // Rate Limit
    RATE_LIMIT_WINDOW_MS: joi.number().default(900000), // 15 minutos
    RATE_LIMIT_MAX: joi.number().default(100), // 100 requisições
    RATE_LIMIT_STANDARD_HEADERS: joi.boolean().default(true),
    RATE_LIMIT_LEGACY_HEADERS: joi.boolean().default(false),

    // Log
    LOG_FORMAT: joi
      .string()
      .valid("combined", "common", "dev", "short", "tiny")
      .default("combined"),
    LOG_DIR: joi.string().default("logs"),
    LOG_LEVEL: joi
      .string()
      .valid("error", "warn", "info", "http", "verbose", "debug", "silly")
      .default("info"),

    // Segurança
    BCRYPT_SALT_ROUNDS: joi.number().min(10).max(20).default(12),
    CSRF_PROTECTION: joi.boolean().default(true),
    SESSION_SECRET: joi.string().allow("").allow(null).default(null),

    // Brevo API
    BREVO_API_KEY: joi.string().required().messages({
      "string.empty": "A chave de API da Brevo é obrigatória",
      "any.required": "A chave de API da Brevo é obrigatória",
    }),
    BREVO_SENDER_EMAIL: joi.string().email().required().messages({
      "string.email":
        "O e-mail do remetente da Brevo deve ser um e-mail válido",
      "string.empty": "O e-mail do remetente da Brevo é obrigatório",
      "any.required": "O e-mail do remetente da Brevo é obrigatório",
    }),
    BREVO_SENDER_NAME: joi.string().required().messages({
      "string.empty": "O nome do remetente da Brevo é obrigatório",
      "any.required": "O nome do remetente da Brevo é obrigatório",
    }),
    BREVO_SMS_SENDER: joi.string().required().messages({
      "string.empty": "O remetente de SMS da Brevo é obrigatório",
      "any.required": "O remetente de SMS da Brevo é obrigatório",
    }),

    // Mercado Pago - Configuração geral
    MERCADOPAGO_ENABLED: joi.boolean().default(true),
    MERCADOPAGO_INTEGRATOR_ID: joi
      .string()
      .default("dev_24c65fb163bf11ea96500242ac130004"),

    // Mercado Pago - Assinaturas (Teste)
    MERCADOPAGO_SUBSCRIPTION_TEST_ENABLED: joi.boolean().default(true),
    MERCADOPAGO_SUBSCRIPTION_PUBLIC_KEY: joi.string().required(),
    MERCADOPAGO_SUBSCRIPTION_ACCESS_TOKEN: joi.string().required(),
    MERCADOPAGO_SUBSCRIPTION_CLIENT_ID: joi.string().required(),
    MERCADOPAGO_SUBSCRIPTION_CLIENT_SECRET: joi.string().required(),
    MERCADOPAGO_SUBSCRIPTION_WEBHOOK_SECRET: joi.string().allow("").default(""),

    // Mercado Pago - Assinaturas (Produção)
    MERCADOPAGO_SUBSCRIPTION_PROD_ENABLED: joi.boolean().default(false),
    MERCADOPAGO_SUBSCRIPTION_PROD_PUBLIC_KEY: joi
      .string()
      .allow("")
      .default(""),
    MERCADOPAGO_SUBSCRIPTION_PROD_ACCESS_TOKEN: joi
      .string()
      .allow("")
      .default(""),
    MERCADOPAGO_SUBSCRIPTION_PROD_CLIENT_ID: joi.string().allow("").default(""),
    MERCADOPAGO_SUBSCRIPTION_PROD_CLIENT_SECRET: joi
      .string()
      .allow("")
      .default(""),
    MERCADOPAGO_SUBSCRIPTION_PROD_WEBHOOK_SECRET: joi
      .string()
      .allow("")
      .default(""),

    // Mercado Pago - Checkout (Teste)
    MERCADOPAGO_CHECKOUT_TEST_ENABLED: joi.boolean().default(true),
    MERCADOPAGO_CHECKOUT_PUBLIC_KEY: joi.string().required(),
    MERCADOPAGO_CHECKOUT_ACCESS_TOKEN: joi.string().required(),
    MERCADOPAGO_CHECKOUT_CLIENT_ID: joi.string().required(),
    MERCADOPAGO_CHECKOUT_CLIENT_SECRET: joi.string().required(),
    MERCADOPAGO_CHECKOUT_WEBHOOK_SECRET: joi.string().allow("").default(""),

    // Mercado Pago - Checkout (Produção)
    MERCADOPAGO_CHECKOUT_PROD_ENABLED: joi.boolean().default(false),
    MERCADOPAGO_CHECKOUT_PROD_PUBLIC_KEY: joi.string().allow("").default(""),
    MERCADOPAGO_CHECKOUT_PROD_ACCESS_TOKEN: joi.string().allow("").default(""),
    MERCADOPAGO_CHECKOUT_PROD_CLIENT_ID: joi.string().allow("").default(""),
    MERCADOPAGO_CHECKOUT_PROD_CLIENT_SECRET: joi.string().allow("").default(""),
    MERCADOPAGO_CHECKOUT_PROD_WEBHOOK_SECRET: joi
      .string()
      .allow("")
      .default(""),

    // Remover variáveis redundantes após migração completa
    MERCADO_PAGO_ACCESS_TOKEN: joi.string().allow(""),
    MERCADO_PAGO_PUBLIC_KEY: joi.string().allow(""),
    MERCADO_PAGO_ENABLED: joi.boolean().default(true),
  })
  .custom((values, helpers) => {
    // Verifica se os ambientes de teste e produção não estão habilitados simultaneamente para assinaturas
    if (
      values.MERCADOPAGO_SUBSCRIPTION_TEST_ENABLED &&
      values.MERCADOPAGO_SUBSCRIPTION_PROD_ENABLED
    ) {
      return helpers.message({
        custom:
          "Não é possível habilitar os ambientes de teste e produção simultaneamente para assinaturas",
      });
    }

    // Verifica se os ambientes de teste e produção não estão habilitados simultaneamente para checkout
    if (
      values.MERCADOPAGO_CHECKOUT_TEST_ENABLED &&
      values.MERCADOPAGO_CHECKOUT_PROD_ENABLED
    ) {
      return helpers.message({
        custom:
          "Não é possível habilitar os ambientes de teste e produção simultaneamente para checkout",
      });
    }

    return values;
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
  const missingVars = error.details.map((detail) => detail.message).join("\n");

  console.error("❌ Configuração de ambiente inválida:");
  console.error(missingVars);

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Configuração de ambiente inválida em produção, encerrando aplicação"
    );
  } else {
    console.warn(
      "⚠️ Continuando com valores padrão em ambiente de desenvolvimento"
    );
  }
}

/**
 * Objeto contendo todas as variáveis de ambiente validadas e tipadas
 */
export const env: Environment = {
  // Ambiente
  nodeEnv: _env.NODE_ENV,
  port: Number(_env.PORT),
  isDevelopment: _env.NODE_ENV === "development",
  isProduction: _env.NODE_ENV === "production",
  isTest: _env.NODE_ENV === "test",

  // Nome da aplicação
  appName: _env.APP_NAME,

  // URL e origens permitidas
  appUrl: _env.APP_URL,
  allowedOrigins: _env.ALLOWED_ORIGINS.split(",").map((origin: string) =>
    origin.trim()
  ),

  // Frontend URL
  frontendUrl: _env.FRONTEND_URL,

  // Database
  databaseUrl: _env.DATABASE_URL,
  databasePoolMin: Number(_env.DATABASE_POOL_MIN),
  databasePoolMax: Number(_env.DATABASE_POOL_MAX),

  // Redis
  redis: {
    host: _env.REDIS_HOST,
    port: Number(_env.REDIS_PORT),
    password: _env.REDIS_PASSWORD || null,
    enabled: _env.REDIS_ENABLED,
  },

  // JWT
  jwt: {
    secret: _env.JWT_SECRET,
    expiresIn: _env.JWT_EXPIRES_IN,
    refreshExpiresIn: _env.JWT_REFRESH_EXPIRES_IN,
    issuer: _env.JWT_ISSUER,
    audience: _env.JWT_AUDIENCE,
  },

  // Rate Limit
  rateLimit: {
    windowMs: Number(_env.RATE_LIMIT_WINDOW_MS),
    max: Number(_env.RATE_LIMIT_MAX),
    standardHeaders: _env.RATE_LIMIT_STANDARD_HEADERS,
    legacyHeaders: _env.RATE_LIMIT_LEGACY_HEADERS,
  },

  // Log
  log: {
    format: _env.LOG_FORMAT,
    dir: _env.LOG_DIR,
    level: _env.LOG_LEVEL,
  },

  // Segurança
  security: {
    bcryptSaltRounds: Number(_env.BCRYPT_SALT_ROUNDS),
    csrfProtection: _env.CSRF_PROTECTION,
    sessionSecret: _env.SESSION_SECRET,
  },

  // Brevo
  brevo: {
    apiKey: _env.BREVO_API_KEY,
    senderEmail: _env.BREVO_SENDER_EMAIL,
    senderName: _env.BREVO_SENDER_NAME,
    smsSender: _env.BREVO_SMS_SENDER,
  },

  // Mercado Pago
  mercadoPago: {
    subscription: {
      testEnabled: _env.MERCADOPAGO_SUBSCRIPTION_TEST_ENABLED,
      publicKey: _env.MERCADOPAGO_SUBSCRIPTION_PUBLIC_KEY,
      accessToken: _env.MERCADOPAGO_SUBSCRIPTION_ACCESS_TOKEN,
      clientId: _env.MERCADOPAGO_SUBSCRIPTION_CLIENT_ID,
      clientSecret: _env.MERCADOPAGO_SUBSCRIPTION_CLIENT_SECRET,
      webhookSecret: _env.MERCADOPAGO_SUBSCRIPTION_WEBHOOK_SECRET,
      // Credenciais de produção
      prodPublicKey: _env.MERCADOPAGO_SUBSCRIPTION_PROD_PUBLIC_KEY,
      prodAccessToken: _env.MERCADOPAGO_SUBSCRIPTION_PROD_ACCESS_TOKEN,
      prodClientId: _env.MERCADOPAGO_SUBSCRIPTION_PROD_CLIENT_ID,
      prodClientSecret: _env.MERCADOPAGO_SUBSCRIPTION_PROD_CLIENT_SECRET,
      prodWebhookSecret: _env.MERCADOPAGO_SUBSCRIPTION_PROD_WEBHOOK_SECRET,
      prodEnabled: _env.MERCADOPAGO_SUBSCRIPTION_PROD_ENABLED,
    },
    checkout: {
      testEnabled: _env.MERCADOPAGO_CHECKOUT_TEST_ENABLED,
      publicKey: _env.MERCADOPAGO_CHECKOUT_PUBLIC_KEY,
      accessToken: _env.MERCADOPAGO_CHECKOUT_ACCESS_TOKEN,
      clientId: _env.MERCADOPAGO_CHECKOUT_CLIENT_ID,
      clientSecret: _env.MERCADOPAGO_CHECKOUT_CLIENT_SECRET,
      webhookSecret: _env.MERCADOPAGO_CHECKOUT_WEBHOOK_SECRET,
      // Credenciais de produção
      prodPublicKey: _env.MERCADOPAGO_CHECKOUT_PROD_PUBLIC_KEY,
      prodAccessToken: _env.MERCADOPAGO_CHECKOUT_PROD_ACCESS_TOKEN,
      prodClientId: _env.MERCADOPAGO_CHECKOUT_PROD_CLIENT_ID,
      prodClientSecret: _env.MERCADOPAGO_CHECKOUT_PROD_CLIENT_SECRET,
      prodWebhookSecret: _env.MERCADOPAGO_CHECKOUT_PROD_WEBHOOK_SECRET,
      prodEnabled: _env.MERCADOPAGO_CHECKOUT_PROD_ENABLED,
    },
    integratorId: _env.MERCADOPAGO_INTEGRATOR_ID,
    platformId: "nodejs",
    integrator: "AdvanceMais",
    enabled: _env.MERCADOPAGO_ENABLED,
  },
};

// Log de configuração de ambiente
if (env.isDevelopment) {
  console.debug("📊 Configuração de ambiente carregada:", {
    nodeEnv: env.nodeEnv,
    port: env.port,
    appName: env.appName,
    frontendUrl: env.frontendUrl,
    databasePoolSize: `${env.databasePoolMin}-${env.databasePoolMax}`,
    redisEnabled: env.redis.enabled,
    jwtExpires: {
      access: env.jwt.expiresIn,
      refresh: env.jwt.refreshExpiresIn,
    },
    rateLimitConfig: {
      windowMs: `${env.rateLimit.windowMs / 60000} minutos`,
      max: env.rateLimit.max,
    },
    logLevel: env.log.level,
    mercadoPagoEnabled: env.mercadoPago.enabled,
    mercadoPagoSubscriptionMode: env.mercadoPago.subscription.prodEnabled
      ? "PRODUÇÃO"
      : "TESTE",
    mercadoPagoCheckoutMode: env.mercadoPago.checkout.prodEnabled
      ? "PRODUÇÃO"
      : "TESTE",
  });
}
