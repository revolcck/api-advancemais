/**
 * Este arquivo é um script JavaScript puro para carregar o Prisma Client
 * Projetado para contornar problemas de importação do TypeScript
 */

// Carregamento do Prisma Client usando require puro
let prismaClient;
let Prisma;

try {
  // Tentativa de carregamento do cliente gerado em node_modules/.prisma
  const prismaModule = require("@prisma/client");
  prismaClient = prismaModule.PrismaClient;
  Prisma = prismaModule.Prisma;
  console.log("📊 PrismaClient carregado de node_modules/.prisma/client");
} catch (e) {
  try {
    // Tentativa alternativa para encontrar o cliente
    console.log(
      "⚠️ Falha ao carregar PrismaClient do caminho padrão, tentando alternativa..."
    );

    // Tentativa de carregamento do cliente gerado em prisma/node_modules
    const clientPath = require.resolve(
      "../../prisma/node_modules/.prisma/client"
    );
    const prismaModule = require(clientPath);
    prismaClient = prismaModule.PrismaClient;
    Prisma = prismaModule.Prisma;
    console.log(
      "📊 PrismaClient carregado de caminho alternativo:",
      clientPath
    );
  } catch (err) {
    console.error("❌ Falha crítica ao carregar o PrismaClient:", err);

    // Criando um cliente falso para evitar erros de runtime
    // Isso permitirá que a aplicação compile, mas gerará erros quando tentar se conectar ao banco
    console.warn(
      "⚠️ Criando stub para PrismaClient para permitir a compilação"
    );

    // Stub do PrismaClient
    prismaClient = class StubPrismaClient {
      constructor() {
        console.error(
          "❌ ATENÇÃO: Usando stub do PrismaClient! O banco de dados não funcionará."
        );
        return new Proxy(
          {},
          {
            get: function (target, prop) {
              if (prop === "$connect")
                return async () => {
                  throw new Error(
                    "PrismaClient não foi inicializado corretamente"
                  );
                };
              if (prop === "$disconnect") return async () => {};
              return () => {};
            },
          }
        );
      }
    };

    // Stub para namespaces Prisma
    Prisma = {
      PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
        constructor(message, opts) {
          super(message);
          this.name = "PrismaClientKnownRequestError";
          this.code = opts?.code || "UNKNOWN";
          this.meta = opts?.meta;
        }
      },
      PrismaClientValidationError: class PrismaClientValidationError extends Error {
        constructor(message) {
          super(message);
          this.name = "PrismaClientValidationError";
        }
      },
    };
  }
}

// Exporta o cliente e os tipos para uso no TypeScript
module.exports = {
  PrismaClient: prismaClient,
  Prisma: Prisma,
};
