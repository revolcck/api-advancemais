/**
 * Script de build para ambiente de produção
 * Resolve o problema "command not found" no Render usando npx
 * Versão atualizada para resolver problemas do Prisma
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Cores para output no console
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

/**
 * Executa um comando com output para o console
 * @param {string} command - Comando a ser executado
 * @param {string} label - Rótulo para identificação do comando
 */
function executeCommand(command, label) {
  console.log(`${colors.bright}${colors.blue}==> ${label}${colors.reset}`);
  try {
    execSync(command, { stdio: "inherit" });
    console.log(
      `${colors.bright}${colors.green}✓ ${label} concluído com sucesso${colors.reset}\n`
    );
    return true;
  } catch (error) {
    console.error(
      `${colors.bright}${colors.red}✗ Erro ao executar ${label}${colors.reset}`
    );
    console.error(`${colors.red}${error.message}${colors.reset}\n`);
    return false;
  }
}

/**
 * Verifica se um arquivo ou diretório existe
 * @param {string} path - Caminho a ser verificado
 */
function ensureExists(filePath, isDirectory = false) {
  try {
    if (!fs.existsSync(filePath)) {
      if (isDirectory) {
        fs.mkdirSync(filePath, { recursive: true });
        console.log(
          `${colors.bright}${colors.green}✓ Diretório criado: ${filePath}${colors.reset}\n`
        );
      } else {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, "");
        console.log(
          `${colors.bright}${colors.green}✓ Arquivo criado: ${filePath}${colors.reset}\n`
        );
      }
    }
  } catch (error) {
    console.error(
      `${colors.bright}${colors.red}✗ Erro ao verificar/criar: ${filePath}${colors.reset}`
    );
    console.error(`${colors.red}${error.message}${colors.reset}\n`);
  }
}

/**
 * Copia o loader para o diretório de build
 */
function copyPrismaLoader() {
  const sourceFile = path.join(process.cwd(), "scripts", "prisma-loader.js");
  const distDir = path.join(process.cwd(), "dist", "scripts");
  const destFile = path.join(distDir, "prisma-loader.js");

  try {
    // Certifica-se de que o diretório de destino existe
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // Copia o arquivo
    fs.copyFileSync(sourceFile, destFile);
    console.log(
      `${colors.bright}${colors.green}✓ Prisma loader copiado para: ${destFile}${colors.reset}\n`
    );
    return true;
  } catch (error) {
    console.error(
      `${colors.bright}${colors.red}✗ Erro ao copiar Prisma loader: ${error.message}${colors.reset}\n`
    );
    return false;
  }
}

// Banner de início
console.log(`
${colors.bright}${colors.blue}=====================================
      BUILD DE PRODUÇÃO INICIADO
=====================================
${colors.reset}
`);

// Inicia o processo de build
(async function () {
  // Passo 0: Verifica se o arquivo prisma-loader.js existe
  const loaderPath = path.join(process.cwd(), "scripts", "prisma-loader.js");
  if (!fs.existsSync(loaderPath)) {
    console.log(
      `${colors.bright}${colors.yellow}⚠️ Arquivo prisma-loader.js não encontrado, criando...${colors.reset}\n`
    );

    // Cria o diretório scripts se não existir
    const scriptsDir = path.join(process.cwd(), "scripts");
    ensureExists(scriptsDir, true);

    // Conteúdo do loader do Prisma
    const loaderContent = `/**
 * Este arquivo é um script JavaScript puro para carregar o Prisma Client
 * Projetado para contornar problemas de importação do TypeScript
 */

// Carregamento do Prisma Client usando require puro
let prismaClient;
let Prisma;

try {
  // Tentativa de carregamento do cliente gerado em node_modules/.prisma
  const prismaModule = require('@prisma/client');
  prismaClient = prismaModule.PrismaClient;
  Prisma = prismaModule.Prisma;
  console.log('📊 PrismaClient carregado de node_modules/.prisma/client');
} catch (e) {
  try {
    // Tentativa alternativa para encontrar o cliente
    console.log('⚠️ Falha ao carregar PrismaClient do caminho padrão, tentando alternativa...');
    
    // Tentativa de carregamento do cliente gerado em prisma/node_modules
    const clientPath = require.resolve('../../prisma/node_modules/.prisma/client');
    const prismaModule = require(clientPath);
    prismaClient = prismaModule.PrismaClient;
    Prisma = prismaModule.Prisma;
    console.log('📊 PrismaClient carregado de caminho alternativo:', clientPath);
  } catch (err) {
    console.error('❌ Falha crítica ao carregar o PrismaClient:', err);
    
    // Criando um cliente falso para evitar erros de runtime
    // Isso permitirá que a aplicação compile, mas gerará erros quando tentar se conectar ao banco
    console.warn('⚠️ Criando stub para PrismaClient para permitir a compilação');
    
    // Stub do PrismaClient
    prismaClient = class StubPrismaClient {
      constructor() {
        console.error('❌ ATENÇÃO: Usando stub do PrismaClient! O banco de dados não funcionará.');
        return new Proxy({}, {
          get: function(target, prop) {
            if (prop === '$connect') return async () => { throw new Error('PrismaClient não foi inicializado corretamente'); };
            if (prop === '$disconnect') return async () => {};
            return () => {};
          }
        });
      }
    };
    
    // Stub para namespaces Prisma
    Prisma = {
      PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
        constructor(message, opts) {
          super(message);
          this.name = 'PrismaClientKnownRequestError';
          this.code = opts?.code || 'UNKNOWN';
          this.meta = opts?.meta;
        }
      },
      PrismaClientValidationError: class PrismaClientValidationError extends Error {
        constructor(message) {
          super(message);
          this.name = 'PrismaClientValidationError';
        }
      }
    };
  }
}

// Exporta o cliente e os tipos para uso no TypeScript
module.exports = {
  PrismaClient: prismaClient,
  Prisma: Prisma
};`;

    // Escreve o conteúdo no arquivo
    fs.writeFileSync(loaderPath, loaderContent);
    console.log(
      `${colors.bright}${colors.green}✓ Arquivo prisma-loader.js criado com sucesso${colors.reset}\n`
    );
  }

  // Passo 1: Gerar cliente Prisma
  const prismaGenerated = executeCommand(
    "npx prisma generate",
    "Geração do Prisma Client"
  );
  if (!prismaGenerated) process.exit(1);

  // Passo 2: Limpar pasta dist
  const distCleaned = executeCommand(
    "npx rimraf dist",
    "Limpeza da pasta dist"
  );
  if (!distCleaned) process.exit(1);

  // Passo 3: Executar script de correção do Prisma
  const prismaFixed = executeCommand(
    "node scripts/fix-prisma.js",
    "Correção do Prisma Client"
  );
  if (!prismaFixed) process.exit(1);

  // Passo 4: Compilar TypeScript
  const tsCompiled = executeCommand("npx tsc", "Compilação do TypeScript");
  if (!tsCompiled) process.exit(1);

  // Passo 5: Processar alias de importação
  const aliasProcessed = executeCommand(
    "npx tsc-alias",
    "Processamento de alias de importação"
  );
  if (!aliasProcessed) process.exit(1);

  // Passo 6: Copiar o prisma-loader.js para a pasta dist
  const loaderCopied = copyPrismaLoader();
  if (!loaderCopied) process.exit(1);

  // Conclusão do build
  console.log(`
${colors.bright}${colors.green}=====================================
      BUILD CONCLUÍDO COM SUCESSO
=====================================
${colors.reset}
`);
})();
