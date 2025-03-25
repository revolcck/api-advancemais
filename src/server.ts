/**
 * Ponto de entrada da aplicação
 * Inicializa o servidor e gerencia o ciclo de vida da aplicação
 */

import { createApp } from "@/config/app";
import { env } from "@/config/environment";
import { db, prisma } from "@/config/database";
import { redisService } from "@/config/redis";
import { logger } from "@/shared/utils/logger.utils";
import * as chalk from "chalk";
import path from "path";
import { format as formatDate } from "date-fns";

// Instância do aplicativo Express
const app = createApp();

/**
 * Função para inicializar as conexões com serviços externos
 */
async function initializeConnections(): Promise<void> {
  try {
    // Conecta ao banco de dados
    await db.connect();

    // Variáveis para status das conexões
    let databaseConnected = false;
    let redisConnected = false;
    let databaseConnections = 0;

    try {
      // Verifica se a conexão com o banco foi bem sucedida
      // e obtém o número de conexões (pool)
      const result = await prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;

      // Obtém o número de conexões do pool MySQL
      try {
        // Isso é específico para MySQL/MariaDB
        const poolStats =
          await prisma.$queryRaw`SHOW STATUS LIKE 'Threads_connected'`;
        if (Array.isArray(poolStats) && poolStats.length > 0) {
          databaseConnections = Number(poolStats[0].Value) || 0;
        }
      } catch (poolError) {
        // Se não conseguir obter o número de conexões, apenas ignora
        databaseConnections = 1; // Assume pelo menos 1 conexão
      }
    } catch (error) {
      databaseConnected = false;
      logger.error("Erro ao verificar conexão com banco de dados", error);
    }

    // Conecta ao Redis se estiver configurado
    if (env.redis.host) {
      try {
        await redisService.connect();
        redisConnected = redisService.isConnected();
      } catch (error) {
        redisConnected = false;
        // Erro já foi registrado no serviço Redis
        // Em desenvolvimento, continuamos mesmo sem Redis
        if (!env.isDevelopment) {
          throw error;
        }
      }
    }

    // Exibe banner com informações do sistema e status das conexões
    showBanner({
      database: databaseConnected,
      redis: redisConnected,
      databaseConnections,
    });

    // Logs adicionais sobre conexões para o arquivo de log
    if (databaseConnected) {
      logger.info("✅ Conexão com banco de dados estabelecida com sucesso", {
        type: "mysql",
        connections: databaseConnections,
        url: env.databaseUrl.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@"), // Oculta credenciais
      });
    }

    if (redisConnected) {
      logger.info("✅ Conexão com Redis estabelecida com sucesso", {
        host: env.redis.host,
        port: env.redis.port,
      });
    } else if (env.redis.host) {
      logger.warn("⚠️ Conexão com Redis não estabelecida", {
        host: env.redis.host,
        port: env.redis.port,
      });
    }
  } catch (error) {
    logger.error("Falha ao inicializar conexões", error);
    process.exit(1);
  }
}

/**
 * Exibe um banner aprimorado com informações do projeto
 */
function showBanner(
  connections: {
    database?: boolean;
    redis?: boolean;
    databaseConnections?: number;
  } = {}
): void {
  const packageJson = require(path.join(process.cwd(), "package.json"));
  const projectName = packageJson.name;
  const projectVersion = packageJson.version;

  const envColor = env.isDevelopment
    ? chalk.yellow
    : env.isProduction
      ? chalk.green
      : chalk.blue;

  const dbStatus = connections.database
    ? chalk.green("✓ Conectado")
    : chalk.red("✗ Desconectado");

  const redisStatus = connections.redis
    ? chalk.green("✓ Conectado")
    : chalk.red("✗ Desconectado");

  const connectionInfo =
    connections.database && connections.databaseConnections
      ? `(${connections.databaseConnections} conexões)`
      : "";

  const memoryUsage = process.memoryUsage();
  const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);

  // Estilo e cores consistentes
  const titleStyle = chalk.cyan.bold;
  const sectionStyle = chalk.cyan;
  const labelStyle = chalk.dim;
  const valueStyle = chalk.white;
  const highlightStyle = chalk.cyan;
  const separatorLine = "  " + chalk.dim("─".repeat(50));

  console.log("\n");
  console.log(titleStyle(`  🚀 ${projectName.toUpperCase()} `));
  console.log(valueStyle(`  ${projectVersion}`));
  console.log(separatorLine);

  // Seção do Sistema
  console.log(sectionStyle("\n  📊 Sistema"));
  console.log(`  ${labelStyle("Node.js:")}     ${valueStyle(process.version)}`);
  console.log(`  ${labelStyle("Ambiente:")}    ${envColor(env.nodeEnv)}`);
  console.log(
    `  ${labelStyle("Porta:")}       ${valueStyle(env.port.toString())}`
  );
  console.log(
    `  ${labelStyle("Memória:")}     ${valueStyle(
      `${memoryUsedMB}MB / ${memoryTotalMB}MB`
    )} ${labelStyle("(utilizada/alocada)")}`
  );

  // Seção de Conexões
  console.log(sectionStyle("\n  🔌 Conexões"));
  console.log(
    `  ${labelStyle("Banco de Dados:")} ${dbStatus} ${
      connectionInfo ? highlightStyle(connectionInfo) : ""
    }`
  );
  console.log(`  ${labelStyle("Redis:")}         ${redisStatus}`);

  // Data de Início
  console.log(separatorLine);
  console.log(
    `  ${labelStyle("Iniciado em:")}  ${valueStyle(
      formatDate(new Date(), "dd/MM/yyyy HH:mm:ss")
    )}`
  );

  // Informações Técnicas
  if (env.isDevelopment) {
    console.log(sectionStyle("\n  🔧 Informações Técnicas"));
    console.log(
      `  ${labelStyle("PID:")}          ${valueStyle(process.pid.toString())}`
    );
    console.log(
      `  ${labelStyle("Plataforma:")}   ${valueStyle(process.platform)}`
    );
    console.log(`  ${labelStyle("Arquitetura:")}  ${valueStyle(process.arch)}`);

    console.log(sectionStyle("\n  📦 Dependências"));
    const dependencies = packageJson.dependencies;
    const keyDeps = [
      "express",
      "@prisma/client",
      "jose",
      "joi",
      "bcryptjs",
      "redis",
    ];

    keyDeps.forEach((dep) => {
      if (dependencies[dep]) {
        console.log(
          `  ${labelStyle("•")} ${labelStyle(dep + ":")} ${valueStyle(
            dependencies[dep]
          )}`
        );
      }
    });
  }

  console.log("\n");
}

/**
 * Função para encerrar conexões graciosamente antes de encerrar o aplicativo
 */
async function shutdown(): Promise<void> {
  logger.info("🛑 Recebido sinal para encerrar o aplicativo");

  try {
    // Desconecta do banco de dados
    await db.disconnect();
    logger.info("🔌 Conexão com banco de dados fechada");

    // Desconecta do Redis se estiver conectado
    if (redisService.isConnected()) {
      await redisService.disconnect();
      logger.info("🔌 Conexão com Redis fechada");
    }

    // Fecha streams de log (se estiver usando a classe Logger)
    if (logger.closeStreams) {
      logger.closeStreams();
    }

    logger.info("✅ Conexões encerradas com sucesso");

    // Dá tempo para os logs serem gravados antes de encerrar
    setTimeout(() => {
      process.exit(0);
    }, 500);
  } catch (error) {
    logger.error("❌ Erro ao encerrar conexões", error);
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
  logger.error("🔥 Exceção não capturada", error);

  // Em produção, é melhor encerrar o processo e deixar o gerenciador de processos reiniciar
  if (env.isProduction) {
    process.exit(1);
  }
});

/**
 * Tratamento global de rejeições de promessas não capturadas
 */
process.on("unhandledRejection", (reason) => {
  logger.error("🔥 Rejeição de promessa não tratada", reason);

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
      logger.info(`🚀 Servidor rodando em http://localhost:${env.port}`);
      logger.info(`🌎 Ambiente: ${env.nodeEnv}`);

      // Registra métricas iniciais
      const memUsage = process.memoryUsage();
      logger.debug("Métricas iniciais", {
        memory: {
          rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        },
        cpu: process.cpuUsage(),
      });
    });

    // Configura timeout do servidor
    server.timeout = 30000; // 30 segundos

    // Configura relatório periódico de status em desenvolvimento
    if (env.isDevelopment) {
      // A cada 15 minutos, exibe um relatório de status
      setInterval(
        () => {
          const memUsage = process.memoryUsage();
          const uptime = process.uptime();

          const days = Math.floor(uptime / 86400);
          const hours = Math.floor((uptime % 86400) / 3600);
          const minutes = Math.floor((uptime % 3600) / 60);

          const uptimeStr =
            days > 0
              ? `${days}d ${hours}h ${minutes}m`
              : hours > 0
                ? `${hours}h ${minutes}m`
                : `${minutes}m`;

          console.log(chalk.cyan("\n📊 Relatório de Status do Servidor"));
          console.log(chalk.white(`  → Uptime: ${uptimeStr}`));
          console.log(
            chalk.white(
              `  → Memória: ${(memUsage.heapUsed / 1024 / 1024).toFixed(
                2
              )}MB / ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`
            )
          );

          // Verifica e relata conexões
          console.log(
            chalk.white(
              `  → Banco de Dados: ${
                db.prisma ? "✓ Conectado" : "✗ Desconectado"
              }`
            )
          );
          console.log(
            chalk.white(
              `  → Redis: ${
                redisService.isConnected() ? "✓ Conectado" : "✗ Desconectado"
              }`
            )
          );
          console.log("");
        },
        15 * 60 * 1000
      ); // 15 minutos
    }
  } catch (error) {
    logger.error("❌ Falha ao iniciar o servidor", error);
    process.exit(1);
  }
})();
