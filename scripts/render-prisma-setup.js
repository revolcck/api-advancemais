/**
 * Script para configuração correta do Prisma Client no ambiente Render
 * Soluciona problemas específicos de carregamento do PrismaClient
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Cores para output no console
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
};

console.log(
  `${colors.bright}${colors.blue}=== CONFIGURAÇÃO DO PRISMA NO RENDER ===${colors.reset}`
);

// Diretórios principais
const projectRoot = process.cwd();
const distDir = path.join(projectRoot, "dist");
const scriptsDir = path.join(projectRoot, "scripts");
const prismaDir = path.join(projectRoot, "prisma");
const nodeModulesDir = path.join(projectRoot, "node_modules");

/**
 * Executa um comando shell com output formatado
 */
function execCommand(command, label) {
  console.log(`${colors.bright}${colors.blue}==> ${label}${colors.reset}`);
  try {
    const output = execSync(command, { stdio: "pipe" }).toString();
    console.log(output);
    console.log(
      `${colors.bright}${colors.green}✓ ${label} concluído com sucesso${colors.reset}\n`
    );
    return true;
  } catch (error) {
    console.error(
      `${colors.bright}${colors.red}✗ Erro ao executar ${label}${colors.reset}`
    );
    console.error(`${colors.red}${error.message}${colors.reset}`);
    console.error(
      `${colors.yellow}Continuando com a configuração...${colors.reset}\n`
    );
    return false;
  }
}

/**
 * Verifica e cria um diretório se não existir
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`${colors.yellow}Criando diretório: ${dir}${colors.reset}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Gera o Prisma Client
 */
function generatePrismaClient() {
  // Verifica se o schema.prisma existe
  const schemaPath = path.join(prismaDir, "schema.prisma");
  if (!fs.existsSync(schemaPath)) {
    console.error(
      `${colors.red}❌ Arquivo schema.prisma não encontrado em: ${schemaPath}${colors.reset}`
    );
    return false;
  }

  // Verifica/cria diretório de geração do client
  const prismaClientDir = path.join(nodeModulesDir, ".prisma", "client");
  ensureDir(prismaClientDir);

  // Gera o cliente do Prisma
  return execCommand("npx prisma generate", "Geração do Prisma Client");
}

/**
 * Verifica os caminhos do Prisma Client
 */
function checkPrismaClientPaths() {
  console.log(
    `${colors.blue}Verificando caminhos do Prisma Client...${colors.reset}`
  );

  // Lista de possíveis caminhos para o Prisma Client
  const possiblePaths = [
    path.join(nodeModulesDir, ".prisma", "client", "index.js"),
    path.join(nodeModulesDir, "@prisma", "client", "index.js"),
    path.join(prismaDir, "node_modules", ".prisma", "client", "index.js"),
  ];

  let foundPaths = [];

  possiblePaths.forEach((p) => {
    if (fs.existsSync(p)) {
      console.log(`${colors.green}✓ Encontrado: ${p}${colors.reset}`);
      foundPaths.push(p);
    } else {
      console.log(`${colors.yellow}⚠️ Não encontrado: ${p}${colors.reset}`);
    }
  });

  return foundPaths;
}

/**
 * Corrige o loader personalizado do Prisma
 */
function createCustomLoader() {
  console.log(
    `${colors.blue}Criando loader personalizado do Prisma...${colors.reset}`
  );

  const loaderPath = path.join(scriptsDir, "prisma-fixed-loader.js");
  const distLoaderPath = path.join(
    distDir,
    "scripts",
    "prisma-fixed-loader.js"
  );

  // Conteúdo do loader personalizado
  const loaderContent = `/**
 * Loader personalizado para o Prisma Client no ambiente Render
 * Fornece mais opções de caminhos e melhor tratamento de erros
 */

// Carregamento do Prisma Client usando require puro
let prismaClient;
let Prisma;

try {
  // Tenta o caminho principal
  const prismaModule = require('@prisma/client');
  prismaClient = prismaModule.PrismaClient;
  Prisma = prismaModule.Prisma;
  console.log('📊 PrismaClient carregado com sucesso de @prisma/client');
} catch (e) {
  try {
    // Tenta o caminho node_modules/.prisma/client
    const prismaModule = require('../../node_modules/.prisma/client');
    prismaClient = prismaModule.PrismaClient;
    Prisma = prismaModule.Prisma;
    console.log('📊 PrismaClient carregado de node_modules/.prisma/client');
  } catch (e2) {
    try {
      // Tenta outro caminho comum
      const prismaModule = require('../../../node_modules/.prisma/client');
      prismaClient = prismaModule.PrismaClient;
      Prisma = prismaModule.Prisma;
      console.log('📊 PrismaClient carregado de ../../../node_modules/.prisma/client');
    } catch (e3) {
      try {
        // Última tentativa com caminho direto
        const clientPath = require.resolve('@prisma/client/index.js');
        console.log('🔍 Tentando resolver PrismaClient de:', clientPath);
        const prismaModule = require(clientPath);
        prismaClient = prismaModule.PrismaClient;
        Prisma = prismaModule.Prisma;
        console.log('📊 PrismaClient carregado de caminho resolvido:', clientPath);
      } catch (err) {
        console.error('❌ Falha crítica ao carregar o PrismaClient:', err);
        
        // Criar stub do PrismaClient para permitir a compilação
        console.warn('⚠️ Criando stub para PrismaClient. O banco de dados não funcionará corretamente.');
        
        // Stub do PrismaClient
        prismaClient = class StubPrismaClient {
          constructor() {
            console.error('❌ ATENÇÃO: Usando stub do PrismaClient! O banco de dados não funcionará corretamente.');
            this.$connect = async () => { 
              throw new Error('PrismaClient não foi inicializado corretamente');
            };
            this.$disconnect = async () => {};
            
            // Retorna um proxy para lidar com qualquer chamada de método
            return new Proxy(this, {
              get: function(target, prop) {
                if (prop === '$connect') return target.$connect;
                if (prop === '$disconnect') return target.$disconnect;
                // Para qualquer outro acesso, retorna uma função que não faz nada
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
  }
}

// Exporta o cliente e os tipos
module.exports = {
  PrismaClient: prismaClient,
  Prisma: Prisma
};
`;

  // Escreve o loader no diretório de scripts
  fs.writeFileSync(loaderPath, loaderContent);
  console.log(
    `${colors.green}✓ Loader personalizado criado em: ${loaderPath}${colors.reset}`
  );

  // Garante que o diretório de scripts exista na pasta dist
  ensureDir(path.join(distDir, "scripts"));

  // Copia o loader para o diretório dist/scripts
  fs.copyFileSync(loaderPath, distLoaderPath);
  console.log(
    `${colors.green}✓ Loader personalizado copiado para: ${distLoaderPath}${colors.reset}`
  );

  return true;
}

/**
 * Modifica o arquivo de configuração do banco de dados
 */
function updateDatabaseConfig() {
  console.log(
    `${colors.blue}Atualizando configuração do banco de dados...${colors.reset}`
  );

  // Caminho do arquivo de configuração do banco de dados
  const databaseConfigPath = path.join(distDir, "config", "database.js");

  if (!fs.existsSync(databaseConfigPath)) {
    console.error(
      `${colors.red}❌ Arquivo de configuração do banco de dados não encontrado: ${databaseConfigPath}${colors.reset}`
    );
    return false;
  }

  try {
    // Lê o conteúdo do arquivo
    let configContent = fs.readFileSync(databaseConfigPath, "utf8");

    // Verifica se o arquivo já foi modificado
    if (configContent.includes("prisma-fixed-loader.js")) {
      console.log(
        `${colors.yellow}⚠️ Arquivo já está usando o loader personalizado.${colors.reset}`
      );
      return true;
    }

    // Modifica a linha de importação do prisma-loader
    configContent = configContent.replace(
      /require\(['"](\.\.\/\.\.\/scripts\/prisma-loader)['"]\)/,
      'require("../../scripts/prisma-fixed-loader")'
    );

    // Escreve o conteúdo modificado de volta ao arquivo
    fs.writeFileSync(databaseConfigPath, configContent);
    console.log(
      `${colors.green}✓ Arquivo de configuração do banco de dados atualizado${colors.reset}`
    );

    return true;
  } catch (error) {
    console.error(
      `${colors.red}❌ Erro ao atualizar arquivo de configuração do banco de dados: ${error.message}${colors.reset}`
    );
    return false;
  }
}

/**
 * Função principal
 */
async function main() {
  console.log(
    `${colors.yellow}Iniciando configuração do Prisma para ambiente Render...${colors.reset}\n`
  );

  // Passo 1: Gerar o Prisma Client
  const clientGenerated = generatePrismaClient();

  // Passo 2: Verificar os caminhos do Prisma Client
  const foundPaths = checkPrismaClientPaths();

  // Passo 3: Criar loader personalizado
  const loaderCreated = createCustomLoader();

  // Passo 4: Atualizar configuração do banco de dados
  const configUpdated = updateDatabaseConfig();

  // Resumo
  console.log(
    `\n${colors.bright}${colors.blue}=== RESUMO DA CONFIGURAÇÃO ===${colors.reset}`
  );
  console.log(
    `${colors.bright}Cliente Prisma gerado: ${
      clientGenerated ? colors.green + "✓" : colors.red + "✗"
    }${colors.reset}`
  );
  console.log(
    `${colors.bright}Caminhos encontrados: ${
      foundPaths.length > 0 ? colors.green + "✓" : colors.red + "✗"
    } (${foundPaths.length})${colors.reset}`
  );
  console.log(
    `${colors.bright}Loader personalizado: ${
      loaderCreated ? colors.green + "✓" : colors.red + "✗"
    }${colors.reset}`
  );
  console.log(
    `${colors.bright}Configuração atualizada: ${
      configUpdated ? colors.green + "✓" : colors.red + "✗"
    }${colors.reset}`
  );

  if (clientGenerated && loaderCreated && configUpdated) {
    console.log(
      `\n${colors.bright}${colors.green}✅ Configuração concluída com sucesso!${colors.reset}`
    );
  } else {
    console.log(
      `\n${colors.bright}${colors.yellow}⚠️ Configuração concluída com avisos. Verifique os logs acima.${colors.reset}`
    );
  }
}

// Executa a função principal
main().catch((error) => {
  console.error(`${colors.red}❌ Erro fatal: ${error.message}${colors.reset}`);
  process.exit(1);
});
