/**
 * Prisma Client Loader otimizado para o ambiente Render
 * Suporta diversos caminhos possíveis incluindo a estrutura do pnpm
 */

// Define todos os caminhos possíveis para o Prisma Client em ordem de prioridade
const possiblePaths = [
  // Caminhos padrão
  "@prisma/client",
  ".prisma/client",
  "../../node_modules/@prisma/client",
  "../../node_modules/.prisma/client",
  "../../../node_modules/@prisma/client",
  "../../../node_modules/.prisma/client",

  // Caminhos específicos do Render
  "/opt/render/project/src/node_modules/@prisma/client",
  "/opt/render/project/src/node_modules/.prisma/client",

  // Caminhos específicos para pnpm no Render (com wildcard)
  "/opt/render/project/src/node_modules/.pnpm/@prisma+client@*/*",
  "/opt/render/project/src/node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client",
  "/opt/render/project/src/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client",

  // Caminho para versões específicas com wildcard
  "/opt/render/project/src/node_modules/.pnpm/@prisma+client@6.6.0*/*",
];

// Função para buscar caminhos dinamicamente com glob para os wildcards
function findPaths(pattern) {
  try {
    const { sync } = require("glob");
    return sync(pattern);
  } catch (error) {
    console.error(
      `Erro ao buscar caminhos com pattern ${pattern}:`,
      error.message
    );
    return [];
  }
}

// Função para encontrar arquivos index.js e index.d.ts
function findPrismaFiles() {
  try {
    const { execSync } = require("child_process");
    console.log("🔍 Buscando arquivos do Prisma Client...");

    // Comandos find usam -type f para garantir que são arquivos
    const commands = [
      'find /opt/render/project/src/node_modules -path "*prisma/client/index.js" -type f | head -n 3',
      'find /opt/render/project/src/node_modules -path "*.prisma/client/index.js" -type f | head -n 3',
      'find /opt/render/project/src/node_modules/.pnpm -path "*@prisma/client*/index.js" -type f | head -n 3',
    ];

    let results = [];

    for (const command of commands) {
      try {
        const output = execSync(command).toString().trim();
        if (output) {
          results = results.concat(output.split("\n").filter(Boolean));
        }
      } catch (err) {
        // Ignora erros de comando, apenas continua
      }
    }

    return results.filter(Boolean);
  } catch (error) {
    console.error("Erro ao buscar arquivos do Prisma Client:", error.message);
    return [];
  }
}

// Tenta carregar o Prisma Client a partir de um caminho
function tryLoadPrismaClient(path) {
  try {
    console.log(`Tentando carregar o Prisma Client de: ${path}`);
    const prismaModule = require(path);

    // Verifica se o módulo tem a interface esperada
    if (prismaModule.PrismaClient) {
      console.log(`✅ Prisma Client carregado com sucesso de: ${path}`);
      return prismaModule;
    } else {
      console.log(
        `❌ Módulo encontrado em ${path}, mas não contém PrismaClient`
      );
      return null;
    }
  } catch (error) {
    // Só loga erros não relacionados a "module not found"
    if (error.code !== "MODULE_NOT_FOUND") {
      console.error(`Erro ao carregar de ${path}:`, error.message);
    }
    return null;
  }
}

// Busca e tenta carregar o Prisma Client
let prismaModule = null;

// 1. Primeiro, tenta os caminhos fixos conhecidos
for (const path of possiblePaths) {
  // Ignora caminhos com wildcard nesta fase
  if (path.includes("*")) continue;

  prismaModule = tryLoadPrismaClient(path);
  if (prismaModule) break;
}

// 2. Se não encontrou, tenta os caminhos com wildcard usando glob
if (!prismaModule) {
  console.log("Tentando encontrar Prisma Client usando patterns...");

  for (const path of possiblePaths) {
    if (!path.includes("*")) continue;

    const resolvedPaths = findPaths(path);
    for (const resolvedPath of resolvedPaths) {
      prismaModule = tryLoadPrismaClient(resolvedPath);
      if (prismaModule) break;
    }

    if (prismaModule) break;
  }
}

// 3. Se ainda não encontrou, busca arquivos específicos usando find
if (!prismaModule) {
  console.log("Tentando encontrar Prisma Client usando busca de arquivos...");
  const prismaFiles = findPrismaFiles();

  for (const file of prismaFiles) {
    prismaModule = tryLoadPrismaClient(file);
    if (prismaModule) break;
  }
}

// 4. Se ainda não encontrou, tenta resolver pelo nome do pacote
if (!prismaModule) {
  try {
    console.log("Tentando resolver @prisma/client pelo nome...");
    const resolved = require.resolve("@prisma/client");
    console.log(`Caminho resolvido: ${resolved}`);
    prismaModule = tryLoadPrismaClient(resolved);
  } catch (error) {
    console.error("Falha ao resolver pelo nome:", error.message);
  }
}

// Se não foi possível carregar o Prisma Client, cria um stub
if (!prismaModule) {
  console.error(
    "❌ Não foi possível encontrar o Prisma Client em nenhum caminho conhecido"
  );
  console.warn("⚠️ Criando stub do Prisma Client para permitir a compilação");

  // Cria classes stub para os tipos necessários
  const PrismaClientStub = class PrismaClient {
    constructor(options = {}) {
      console.error(
        "❌ ATENÇÃO: Usando stub do PrismaClient! O banco de dados não funcionará."
      );

      // Retorna um proxy para simular toda a API do Prisma
      return new Proxy(this, {
        get: (target, prop) => {
          // Métodos especiais
          if (prop === "$connect") {
            return async () => {
              throw new Error("PrismaClient não foi inicializado corretamente");
            };
          }
          if (prop === "$disconnect") return async () => {};
          if (prop === "$on") return () => {};
          if (prop === "$use") return () => {};
          if (prop === "$queryRaw") return async () => [];
          if (prop === "$executeRaw") return async () => {};
          if (prop === "$transaction") return async (fn) => fn({});

          // Para todos os outros métodos, retorna uma função que retorna um proxy
          // para permitir chamadas encadeadas
          return () =>
            new Proxy(
              {},
              {
                get: () => () => ({}),
                apply: () => ({}),
              }
            );
        },
      });
    }
  };

  // Cria stubs para os tipos de erro
  class PrismaClientKnownRequestError extends Error {
    constructor(message, opts = {}) {
      super(message);
      this.name = "PrismaClientKnownRequestError";
      this.code = opts.code || "UNKNOWN";
      this.meta = opts.meta || {};
      this.clientVersion = opts.clientVersion || "stub";
    }
  }

  class PrismaClientValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = "PrismaClientValidationError";
    }
  }

  class PrismaClientRustPanicError extends Error {
    constructor(message) {
      super(message);
      this.name = "PrismaClientRustPanicError";
    }
  }

  prismaModule = {
    PrismaClient: PrismaClientStub,
    Prisma: {
      PrismaClientKnownRequestError,
      PrismaClientValidationError,
      PrismaClientRustPanicError,
    },
  };
}

// Exporta o módulo encontrado ou o stub
module.exports = prismaModule;
