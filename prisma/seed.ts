import { runAllSeeds } from "./seeds";
import { prisma } from "./seeds/utils";

/**
 * Função principal de seed
 */
async function main() {
  try {
    console.log("Iniciando seed do banco de dados...");

    // Executa todos os seeds
    await runAllSeeds();

    console.log("Seed finalizado com sucesso!");
  } catch (error) {
    console.error("Erro durante a execução do seed:", error);
    process.exit(1);
  } finally {
    // Desconecta do banco de dados ao finalizar
    await prisma.$disconnect();
  }
}

// Executa o seed
main();
