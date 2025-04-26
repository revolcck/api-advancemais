/**
 * Script de deploy otimizado para o ambiente Render
 * Resolve problemas específicos de caminho do Prisma Client
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Cores para melhor visualização no console
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  bold: "\x1b[1m",
};

// Imprime cabeçalho do script
console.log(`
${colors.bold}${colors.blue}====================================================
       SCRIPT DE DEPLOY PARA RENDER - API PROJETO
====================================================
${colors.reset}
`);

/**
 * Executa um comando com tratamento de erros
 * @param {string} command Comando a ser executado
 * @param {string} description Descrição do comando
 * @param {boolean} critical Se o comando é crítico para o deploy
 * @returns {boolean} Se o comando foi bem-sucedido
 */
function executeCommand(command, description, critical = true) {
  console.log(`${colors.blue}➤ ${description}...${colors.reset}`);

  try {
    // Executa o comando e retorna a saída
    const output = execSync(command, { stdio: "pipe" }).toString();
    console.log(
      `${colors.green}✓ ${description} concluído com sucesso${colors.reset}`
    );

    // Imprime a saída do comando de forma limitada (evita logs muito grandes)
    if (output && output.length > 0) {
      // Limita a saída a 20 linhas
      const limitedOutput = output.split("\n").slice(0, 20).join("\n");
      console.log(`${colors.bold}Saída:${colors.reset}\n${limitedOutput}`);

      if (output.split("\n").length > 20) {
        console.log(`${colors.yellow}[Saída truncada...]${colors.reset}`);
      }
    }

    return true;
  } catch (error) {
    console.error(
      `${colors.red}✗ Erro ao executar ${description}${colors.reset}`
    );
    console.error(`${colors.red}${error.message}${colors.reset}`);

    if (error.stdout) {
      console.error(
        `${colors.yellow}Saída:${colors.reset}\n${error.stdout.toString()}`
      );
    }

    if (error.stderr) {
      console.error(
        `${colors.red}Erro:${colors.reset}\n${error.stderr.toString()}`
      );
    }

    // Se o comando for crítico, encerra o processo
    if (critical) {
      console.error(
        `${colors.red}${colors.bold}Falha crítica, abortando deploy!${colors.reset}`
      );
      process.exit(1);
    }

    return false;
  }
}

/**
 * Criar ou modificar um arquivo com conteúdo específico
 * @param {string} filePath Caminho do arquivo
 * @param {string} content Conteúdo do arquivo
 * @param {string} description Descrição da operação
 */
function createOrUpdateFile(filePath, content, description) {
  try {
    console.log(`${colors.blue}➤ ${description}...${colors.reset}`);

    // Certifica-se de que o diretório existe
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Escreve o arquivo
    fs.writeFileSync(filePath, content);
    console.log(
      `${colors.green}✓ ${description} concluído com sucesso${colors.reset}`
    );

    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Erro ao ${description}${colors.reset}`);
    console.error(`${colors.red}${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Verifica se determinadas variáveis de ambiente estão definidas
 * @param {string[]} requiredEnvVars Lista de variáveis de ambiente necessárias
 */
function checkEnvironmentVariables(requiredEnvVars) {
  console.log(
    `${colors.blue}➤ Verificando variáveis de ambiente...${colors.reset}`
  );

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.warn(
      `${colors.yellow}⚠️ Variáveis de ambiente ausentes: ${missingVars.join(
        ", "
      )}${colors.reset}`
    );
    console.warn(
      `${colors.yellow}Certifique-se de configurá-las no painel do Render!${colors.reset}`
    );
  } else {
    console.log(
      `${colors.green}✓ Todas as variáveis de ambiente necessárias estão definidas${colors.reset}`
    );
  }
}

/**
 * Cria um arquivo Prisma loader customizado para o Render
 */
function createCustomPrismaLoader() {
  const loaderContent = `/**
 * Loader personalizado para o Prisma Client no ambiente Render com pnpm
 */

// Caminhos possíveis para o Prisma Client em diferentes ambientes
const possiblePaths = [
  // Caminhos padrão
  '@prisma/client',
  '../../node_modules/@prisma/client',
  '../../../node_modules/@prisma/client',
  
  // Caminhos específicos do Render
  '/opt/render/project/src/node_modules/@prisma/client',
  '/opt/render/project/src/node_modules/.prisma/client',
  
  // Caminhos específicos para pnpm no Render
  '/opt/render/project/src/node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client',
  '/opt/render/project/src/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client'
];

// Inicializa as exportações padrão
let prismaExports;

// Tenta carregar o Prisma Client de cada caminho possível
for (const modulePath of possiblePaths) {
  try {
    console.log(\`Tentando carregar Prisma Client de: \${modulePath}\`);
    prismaExports = require(modulePath);
    console.log(\`✅ Prisma Client carregado com sucesso de: \${modulePath}\`);
    
    // Se encontrou, exporta e para a busca
    module.exports = prismaExports;
    break;
  } catch (err) {
    // Silencia erros de 'module not found' mas loga outros tipos de erro
    if (err.code !== 'MODULE_NOT_FOUND') {
      console.error(\`❌ Erro ao carregar \${modulePath}: \${err.message}\`);
    }
  }
}

// Se nenhum caminho funcionou, procura dinamicamente
if (!prismaExports) {
  try {
    console.log('🔍 Tentando localizar @prisma/client dinamicamente...');
    const { execSync } = require('child_process');
    
    // Tenta encontrar os caminhos instalados do Prisma Client
    const findCommand = 'find /opt/render/project/src/node_modules -path "*prisma/client/index.js" | head -n 1';
    const clientPath = execSync(findCommand).toString().trim();
    
    if (clientPath && clientPath.length > 0) {
      console.log(\`🔍 Encontrado caminho: \${clientPath}\`);
      prismaExports = require(clientPath);
      console.log('✅ Prisma Client carregado dinamicamente com sucesso');
      module.exports = prismaExports;
    } else {
      throw new Error('Não foi possível encontrar o caminho do Prisma Client');
    }
  } catch (dynamicError) {
    console.error(\`❌ Erro na busca dinâmica: \${dynamicError.message}\`);
    
    // Cria uma implementação de stub como último recurso
    console.warn('⚠️ Criando implementação de fallback do PrismaClient');
    
    module.exports = {
      PrismaClient: class StubPrismaClient {
        constructor() {
          console.error('⚠️ USANDO STUB DO PRISMA CLIENT - Conexões de banco não funcionarão');
          return new Proxy({}, {
            get: function(target, prop) {
              if (prop === '$connect') {
                return async () => { 
                  console.error('❌ Erro: PrismaClient está usando implementação stub');
                  throw new Error('PrismaClient não foi inicializado corretamente');
                };
              }
              if (prop === '$disconnect') return async () => {};
              if (prop === '$on') return () => {};
              if (prop === '$transaction') return async (fn) => fn({});
              if (prop === '$queryRaw') return async () => [];
              
              // Retorna um proxy para chamadas encadeadas
              return () => new Proxy({}, {
                get: () => () => ({}),
                apply: () => ({})
              });
            }
          });
        }
      },
      Prisma: {
        PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
          constructor(message, opts = {}) {
            super(message);
            this.name = 'PrismaClientKnownRequestError';
            this.code = opts.code || 'UNKNOWN';
            this.meta = opts.meta || {};
            this.clientVersion = opts.clientVersion || 'stub';
          }
        },
        PrismaClientValidationError: class PrismaClientValidationError extends Error {
          constructor(message) {
            super(message);
            this.name = 'PrismaClientValidationError';
          }
        }
      }
    };
  }
}
`;

  // Cria o arquivo do loader
  const loaderPath = path.join(
    process.cwd(),
    "scripts",
    "prisma-render-loader.js"
  );
  createOrUpdateFile(
    loaderPath,
    loaderContent,
    "Criando loader customizado para o Prisma no Render"
  );

  // Cria um diretório para a cópia do loader na pasta dist
  const distDir = path.join(process.cwd(), "dist", "scripts");
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copia o loader para a pasta dist
  const distLoaderPath = path.join(distDir, "prisma-render-loader.js");
  fs.copyFileSync(loaderPath, distLoaderPath);
  console.log(
    `${colors.green}✓ Loader customizado copiado para pasta dist com sucesso${colors.reset}`
  );
}

/**
 * Aplica patch no código compilado para usar o loader customizado
 */
function patchCompiledCode() {
  const databaseJsPath = path.join(
    process.cwd(),
    "dist",
    "config",
    "database.js"
  );

  if (!fs.existsSync(databaseJsPath)) {
    console.error(
      `${colors.red}✗ Arquivo database.js não encontrado em dist/config!${colors.reset}`
    );
    return false;
  }

  try {
    console.log(
      `${colors.blue}➤ Aplicando patch no database.js...${colors.reset}`
    );

    // Lê o conteúdo atual
    let content = fs.readFileSync(databaseJsPath, "utf8");

    // Substitui o require do loader padrão pelo customizado
    content = content.replace(
      /require\(['"](\.\.\/\.\.\/scripts\/prisma-loader)['"]\)/g,
      'require("../../scripts/prisma-render-loader")'
    );

    // Escreve o conteúdo modificado
    fs.writeFileSync(databaseJsPath, content);

    console.log(
      `${colors.green}✓ Patch aplicado com sucesso no database.js${colors.reset}`
    );
    return true;
  } catch (error) {
    console.error(
      `${colors.red}✗ Erro ao aplicar patch: ${error.message}${colors.reset}`
    );
    return false;
  }
}

/**
 * Verifica e configura a porta correta para o Render
 */
function configurePort() {
  // O Render espera que a aplicação escute na porta especificada pela variável PORT
  const port = process.env.PORT || 10000;

  console.log(
    `${colors.blue}➤ Configurando aplicação para usar a porta ${port}...${colors.reset}`
  );

  // Cria um arquivo .env.production com a porta configurada
  const envContent = `PORT=${port}\n`;
  createOrUpdateFile(
    path.join(process.cwd(), ".env.production"),
    envContent,
    "Criando arquivo .env.production com configuração de porta"
  );

  return true;
}

// Executa as etapas de deploy em sequência
async function deploy() {
  console.log(
    `${colors.bold}${colors.blue}Iniciando deploy no Render...${colors.reset}`
  );

  // Verifica variáveis de ambiente
  checkEnvironmentVariables(["DATABASE_URL", "JWT_SECRET"]);

  // Configura a porta correta
  configurePort();

  // Limpa a pasta dist
  executeCommand("rm -rf dist", "Limpando pasta dist");

  // Cria o loader personalizado do Prisma para o Render
  createCustomPrismaLoader();

  // Gera o Prisma Client
  executeCommand("npx prisma generate", "Gerando Prisma Client");

  // Compila o TypeScript
  executeCommand("npx tsc", "Compilando TypeScript");

  // Processa alias de importação (se aplicável)
  executeCommand("npx tsc-alias", "Processando alias de importação", false);

  // Aplica patch no código compilado
  patchCompiledCode();

  console.log(
    `${colors.bold}${colors.green}Deploy preparado com sucesso!${colors.reset}`
  );
  console.log(
    `${colors.bold}${colors.green}A aplicação está pronta para ser iniciada pelo Render.${colors.reset}`
  );
}

// Executa o deploy
deploy().catch((error) => {
  console.error(
    `${colors.red}Erro fatal durante o deploy:${colors.reset}`,
    error
  );
  process.exit(1);
});
