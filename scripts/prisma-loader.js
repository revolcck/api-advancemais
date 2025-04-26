/**
 * Loader aprimorado para o Prisma Client
 * Busca o cliente em múltiplos caminhos possíveis no ambiente Render
 */

// Carregamento do Prisma Client usando require puro
let prismaClient;
let Prisma;

// Lista de caminhos possíveis para o Prisma Client
const possiblePaths = [
  // Caminho padrão do @prisma/client
  "@prisma/client",
  // Caminhos para node_modules/.prisma/client
  "../../node_modules/.prisma/client",
  "../../../node_modules/.prisma/client",
  // Paths diretos para o ambiente Render
  "/opt/render/project/src/node_modules/@prisma/client",
  "/opt/render/project/src/node_modules/.prisma/client",
];

// Variável para rastrear se um módulo válido foi encontrado
let moduleFound = false;

// Função para tentar carregar de um caminho
function tryLoadFromPath(path) {
  try {
    console.log(`Tentando carregar PrismaClient de: ${path}`);
    const prismaModule = require(path);

    // Verifica se o módulo tem as propriedades esperadas
    if (prismaModule.PrismaClient) {
      prismaClient = prismaModule.PrismaClient;
      Prisma = prismaModule.Prisma;
      console.log(`✅ PrismaClient carregado com sucesso de: ${path}`);
      return true;
    }
    console.log(`❌ Módulo encontrado em ${path}, mas não contém PrismaClient`);
    return false;
  } catch (error) {
    // Apenas registra erro se for diferente de "módulo não encontrado"
    if (error.code !== "MODULE_NOT_FOUND") {
      console.error(`Erro ao carregar de ${path}:`, error.message);
    }
    return false;
  }
}

// Tenta carregar de cada caminho na lista
for (const path of possiblePaths) {
  if (tryLoadFromPath(path)) {
    moduleFound = true;
    break;
  }
}

// Se não encontrou em nenhum caminho, tenta um método alternativo
if (!moduleFound) {
  console.warn("⚠️ Nenhum caminho funcionou. Tentando resolver por nome...");
  try {
    const resolvedPath = require.resolve("@prisma/client");
    console.log(`Resolvido caminho para @prisma/client: ${resolvedPath}`);

    if (tryLoadFromPath(resolvedPath)) {
      moduleFound = true;
    }
  } catch (error) {
    console.error(
      "❌ Falha ao resolver caminho para @prisma/client:",
      error.message
    );
  }
}

// Se ainda não encontrou, cria um stub
if (!moduleFound) {
  console.error(
    "❌ Não foi possível encontrar PrismaClient em nenhum caminho conhecido"
  );
  console.warn("⚠️ Criando stub para PrismaClient para permitir a compilação");

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
            if (prop === "$connect") {
              return async () => {
                throw new Error(
                  "PrismaClient não foi inicializado corretamente"
                );
              };
            }
            if (prop === "$disconnect") {
              return async () => {};
            }
            if (prop === "$queryRaw" || prop === "$executeRaw") {
              return () => {
                throw new Error(
                  "PrismaClient não foi inicializado corretamente"
                );
              };
            }
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

// Exporta o cliente e os tipos
module.exports = {
  PrismaClient: prismaClient,
  Prisma: Prisma,
};
