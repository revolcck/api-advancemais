/**
 * Script de build para ambiente de produção
 * Resolve o problema "command not found" no Render usando npx
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

// Banner de início
console.log(`
${colors.bright}${colors.blue}=====================================
      BUILD DE PRODUÇÃO INICIADO
=====================================
${colors.reset}
`);

// Inicia o processo de build
(async function () {
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

  // Conclusão do build
  console.log(`
${colors.bright}${colors.green}=====================================
      BUILD CONCLUÍDO COM SUCESSO
=====================================
${colors.reset}
`);
})();
