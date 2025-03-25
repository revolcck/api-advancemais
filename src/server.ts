import { createApp } from "@/config/app";
import { env } from "@/config/environment";
import { db } from "@/config/database";
import { redisService } from "@/config/redis";
import { logInfo, logError } from "@/config/logger";

// Instância do aplicativo Express
const app = createApp();

/**
 * Função para inicializar as conexões com serviços externos
 */
async function initializeConnections(): Promise<void> {
  try {
    // Conecta ao banco de dados
    await db.connect();

    // Conecta ao Redis se estiver configurado
    if (env.redis.host) {
      await redisService.connect();
    }
  } catch (error) {
    logError("Falha ao inicializar conexões:", error);
    process.exit(1);
  }
}

/**
 * Função para encerrar conexões graciosamente antes de encerrar o aplicativo
 */
async function shutdown(): Promise<void> {
  logInfo("Recebido sinal para encerrar o aplicativo");

  try {
    // Desconecta do banco de dados
    await db.disconnect();

    // Desconecta do Redis se estiver conectado
    if (redisService.isConnected()) {
      await redisService.disconnect();
    }

    logInfo("Conexões encerradas com sucesso");
    process.exit(0);
  } catch (error) {
    logError("Erro ao encerrar conexões:", error);
    process.exit(1);
  }
}

/**
 * Configura o tratamento de sinais do sistema operacional
 * para encerrar a aplicação graciosamente
 */
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

/**
 * Tratamento global de exceções não capturadas
 */
process.on("uncaughtException", (error) => {
  logError("Exceção não capturada:", error);

  // Em produção, é melhor encerrar o processo e deixar o gerenciador de processos reiniciar
  if (env.isProduction) {
    process.exit(1);
  }
});

/**
 * Tratamento global de rejeições de promessas não capturadas
 */
process.on("unhandledRejection", (reason) => {
  logError("Rejeição de promessa não tratada:", reason);

  // Em produção, é melhor encerrar o processo e deixar o gerenciador de processos reiniciar
  if (env.isProduction) {
    process.exit(1);
  }
});

/**
 * Inicializa as conexões e inicia o servidor HTTP
 */
(async () => {
  try {
    // Inicializa conexões com serviços externos
    await initializeConnections();

    // Inicia o servidor HTTP
    const server = app.listen(env.port, () => {
      logInfo(`Servidor rodando em http://localhost:${env.port}`);
      logInfo(`Ambiente: ${env.nodeEnv}`);
    });

    // Configura timeout do servidor
    server.timeout = 30000; // 30 segundos
  } catch (error) {
    logError("Falha ao iniciar o servidor:", error);
    process.exit(1);
  }
})();
