import { seedManager } from "./seeds/utils/SeedManager";
import { registerAllSeeds } from "./seeds";
import { logger } from "./seeds/utils/logger";

/**
 * Função principal de seed
 */
async function main() {
  logger.section("Iniciando seed do banco de dados");

  try {
    // Registra todos os seeds disponíveis
    registerAllSeeds();

    // Executa todos os seeds na ordem correta considerando dependências
    await seedManager.executeAll();

    logger.section("Seed finalizado com sucesso!");
  } catch (error) {
    logger.error("Erro durante a execução do seed:", error);
    process.exit(1);
  } finally {
    // Desconecta do banco de dados ao finalizar
    await seedManager.disconnect();
  }
}

// Executa o seed
main();
