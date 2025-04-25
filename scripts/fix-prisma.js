const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * Este script resolve problemas comuns do Prisma durante o processo de build
 */
console.log("🚀 Iniciando fix-prisma.js");

// Verificar e criar diretório para arquivos do Prisma Client
const prismaClientDir = path.join(
  process.cwd(),
  "node_modules",
  ".prisma",
  "client"
);
if (!fs.existsSync(prismaClientDir)) {
  console.log(`📁 Criando diretório ${prismaClientDir}`);
  fs.mkdirSync(prismaClientDir, { recursive: true });
}

// Verificar arquivo de schema do Prisma
const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
if (!fs.existsSync(schemaPath)) {
  console.error(
    "⚠️ Arquivo schema.prisma não encontrado. Verifique sua estrutura de pastas."
  );
}

// Forçar geração do Prisma Client
try {
  console.log("🔄 Regenerando Prisma Client");
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("✅ Prisma Client regenerado com sucesso");
} catch (error) {
  console.error("❌ Erro ao gerar Prisma Client:", error.message);
  process.exit(1);
}

// Verificar se os arquivos foram gerados corretamente
const clientIndexPath = path.join(prismaClientDir, "index.js");
if (fs.existsSync(clientIndexPath)) {
  console.log(
    "✅ Verificação concluída: Arquivos do Prisma Client encontrados"
  );
} else {
  console.warn("⚠️ Prisma Client pode não ter sido gerado corretamente");
}

console.log("✅ Script fix-prisma.js concluído");
