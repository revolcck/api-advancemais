import fs from "fs";
import path from "path";
import { createWriteStream, WriteStream } from "fs";
import { format as formatDate } from "date-fns";
import { env } from "@/config/environment";
import chalk from "chalk";
import { inspect } from "util";
import { hostname } from "os";

/**
 * Níveis de log disponíveis
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "audit" | "access";

/**
 * Definição do tipo de função chalk para evitar problemas de tipagem
 */
type ChalkColorFunction = (text: string) => string;

/**
 * Configuração para cada nível de log
 */
interface LogLevelConfig {
  label: string;
  color: ChalkColorFunction;
  console: boolean;
  file: boolean;
}

/**
 * Dados para registro de auditoria
 */
export interface AuditData {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: object;
  ip?: string;
  statusCode?: number;
  method?: string;
  path?: string;
  userAgent?: string;
  duration?: number;
}

/**
 * Configurações para inicialização do Logger
 */
export interface LoggerOptions {
  logDir?: string;
  maxLogSize?: number;
  maxLogFiles?: number;
  disableConsole?: boolean;
  disableFiles?: boolean;
  minLevel?: LogLevel;
}

/**
 * Status de conexões para exibição no banner
 */
export interface ConnectionStatus {
  database?: boolean;
  redis?: boolean;
  databaseConnections?: number;
  kafkaConnected?: boolean;
  elasticsearchConnected?: boolean;
  customServices?: Record<string, boolean>;
}

// Valores padrão para opções do logger
const DEFAULT_OPTIONS: Required<LoggerOptions> = {
  logDir: env.log?.dir || "logs",
  maxLogSize: 10 * 1024 * 1024, // 10MB
  maxLogFiles: 10,
  disableConsole: false,
  disableFiles: false,
  minLevel: env.isDevelopment ? "debug" : "info",
};

/**
 * Configuração dos níveis de log com suas características
 */
const LOG_LEVELS: Record<LogLevel, LogLevelConfig> = {
  debug: {
    label: "DEBUG",
    color: chalk.cyan,
    console: env.isDevelopment,
    file: env.isDevelopment,
  },
  info: {
    label: "INFO",
    color: chalk.blue,
    console: true,
    file: true,
  },
  warn: {
    label: "WARN",
    color: chalk.yellow,
    console: true,
    file: true,
  },
  error: {
    label: "ERROR",
    color: chalk.red,
    console: true,
    file: true,
  },
  audit: {
    label: "AUDIT",
    color: chalk.magenta,
    console: env.isDevelopment,
    file: true,
  },
  access: {
    label: "ACCESS",
    color: chalk.green,
    console: env.isDevelopment,
    file: true,
  },
};

/**
 * Mapeamento de níveis de log para seus respectivos arquivos
 */
const LOG_FILE_MAPPING: Record<LogLevel, string> = {
  debug: "app",
  info: "app",
  warn: "app",
  error: "error",
  audit: "audit",
  access: "access",
};

/**
 * Classe Logger que implementa um sistema avançado de logging
 * com suporte a múltiplos destinos e configurações
 */
export class Logger {
  private static instance: Logger;
  private streams: Map<string, WriteStream> = new Map();
  private readonly options: Required<LoggerOptions>;
  private readonly projectName: string;
  private readonly projectVersion: string;
  private readonly hostname: string;
  private readonly startTime: Date;
  private readonly logLevelValues: Record<LogLevel, number>;

  /**
   * Construtor privado para implementar o padrão Singleton
   * @param options Opções de configuração do logger
   */
  private constructor(options: LoggerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.startTime = new Date();
    this.hostname = hostname();

    // Define valores numéricos para cada nível de log (para comparação)
    this.logLevelValues = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      audit: 2, // Mesmo nível de warn
      access: 1, // Mesmo nível de info
    };

    // Carrega informações do package.json
    try {
      const packageJson = require(path.join(process.cwd(), "package.json"));
      this.projectName = packageJson.name || "app";
      this.projectVersion = packageJson.version || "1.0.0";
    } catch (error) {
      this.projectName = "app";
      this.projectVersion = "1.0.0";

      // Não podemos usar this.error aqui, pois ainda estamos inicializando
      console.error("Erro ao carregar package.json:", error);
    }

    if (!this.options.disableFiles) {
      this.initializeFileSystem();
    }
  }

  /**
   * Obtém a instância única do Logger (padrão Singleton)
   * @param options Opções de configuração do logger
   * @returns Instância única do Logger
   */
  public static getInstance(options?: LoggerOptions): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(options);
    }
    return Logger.instance;
  }

  /**
   * Inicializa o sistema de arquivos para os logs
   */
  private initializeFileSystem(): void {
    const logDir = path.isAbsolute(this.options.logDir)
      ? this.options.logDir
      : path.join(process.cwd(), this.options.logDir);

    // Cria o diretório de logs se não existir
    if (!fs.existsSync(logDir)) {
      try {
        fs.mkdirSync(logDir, { recursive: true });
      } catch (error) {
        console.error(`Erro ao criar diretório de logs: ${error}`);
        return; // Se não conseguir criar, não tenta inicializar os streams
      }
    }

    // Inicializa os streams de arquivo para cada tipo de log
    const logTypes = ["app", "error", "audit", "access"];

    logTypes.forEach((type) => {
      try {
        const filePath = path.join(logDir, `${type}.log`);

        // Verifica se precisamos fazer rotação de logs
        this.checkRotation(filePath);

        const stream = createWriteStream(filePath, { flags: "a" });
        this.streams.set(type, stream);

        // Registra início de nova sessão
        const sessionStart = this.formatLogMessage(
          "info",
          `===== SESSÃO DE LOG INICIADA - ${this.projectName} v${this.projectVersion} =====`,
          { hostname: this.hostname, pid: process.pid }
        );

        stream.write(`${sessionStart}\n`);
      } catch (error) {
        console.error(`Erro ao inicializar stream de log ${type}: ${error}`);
      }
    });
  }

  /**
   * Verifica se um arquivo de log precisa de rotação baseado no tamanho
   * @param filePath Caminho completo do arquivo de log
   */
  private checkRotation(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);

        if (stats.size >= this.options.maxLogSize) {
          this.rotateLog(filePath);
        }
      }
    } catch (error) {
      console.error(`Erro ao verificar rotação de logs: ${error}`);
    }
  }

  /**
   * Realiza rotação de arquivos de log
   * @param filePath Caminho completo do arquivo de log a ser rotacionado
   */
  private rotateLog(filePath: string): void {
    try {
      const baseFileName = path.basename(filePath, ".log");
      const dirName = path.dirname(filePath);
      const timestamp = formatDate(new Date(), "yyyyMMdd-HHmmss");

      // Fecha o stream existente se estiver aberto
      const streamName = baseFileName;
      const stream = this.streams.get(streamName);

      if (stream) {
        stream.end();
        this.streams.delete(streamName);
      }

      // Move o arquivo atual para um arquivo com timestamp
      const newFilePath = path.join(
        dirName,
        `${baseFileName}-${timestamp}.log`
      );
      fs.renameSync(filePath, newFilePath);

      // Limita a quantidade de arquivos de backup
      this.cleanupOldLogFiles(dirName, baseFileName);

      // Cria um novo stream para o arquivo
      const newStream = createWriteStream(filePath, { flags: "a" });
      this.streams.set(streamName, newStream);
    } catch (error) {
      console.error(`Erro ao rotacionar arquivo de log: ${error}`);
    }
  }

  /**
   * Limpa arquivos de log antigos quando excede o número máximo
   * @param dirName Diretório dos arquivos de log
   * @param baseFileName Nome base do arquivo de log
   */
  private cleanupOldLogFiles(dirName: string, baseFileName: string): void {
    try {
      // Lista todos os arquivos de backup deste tipo
      const files = fs
        .readdirSync(dirName)
        .filter(
          (file) => file.startsWith(baseFileName + "-") && file.endsWith(".log")
        )
        .map((file) => ({
          name: file,
          path: path.join(dirName, file),
          time: fs.statSync(path.join(dirName, file)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time); // Ordena do mais recente para o mais antigo

      // Remove arquivos excedentes
      if (files.length >= this.options.maxLogFiles) {
        files.slice(this.options.maxLogFiles - 1).forEach((file) => {
          fs.unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error(`Erro ao limpar arquivos de log antigos: ${error}`);
    }
  }

  /**
   * Formata uma mensagem de log com timestamp, nível e informações adicionais
   * @param level Nível do log
   * @param message Mensagem a ser registrada
   * @param data Dados adicionais a serem incluídos no log
   * @returns Mensagem formatada
   */
  private formatLogMessage(
    level: LogLevel,
    message: string,
    data?: any
  ): string {
    const timestamp = formatDate(new Date(), "yyyy-MM-dd HH:mm:ss.SSS");
    const levelConfig = LOG_LEVELS[level];

    // Sanitiza a mensagem para evitar injeção de caracteres especiais
    const sanitizedMessage = this.sanitizeLogMessage(message);

    let formattedData = "";
    if (data) {
      try {
        if (typeof data === "object") {
          // Sanitiza dados sensíveis antes de logar
          const sanitizedData = this.sanitizeSensitiveData(data);

          formattedData = inspect(sanitizedData, {
            depth: 5,
            colors: false,
            compact: false,
          });
        } else {
          formattedData = String(data);
        }
      } catch (error) {
        formattedData = `[Erro ao formatar dados: ${error}]`;
      }
    }

    return `[${timestamp}] [${levelConfig.label}] [${this.hostname}:${
      process.pid
    }] ${sanitizedMessage}${formattedData ? `\n${formattedData}` : ""}`;
  }

  /**
   * Sanitiza uma mensagem de log para evitar problemas de formatação
   * @param message Mensagem original
   * @returns Mensagem sanitizada
   */
  private sanitizeLogMessage(message: string): string {
    // Remove caracteres que podem causar problemas em logs
    return message
      .replace(/[\r\n]+/g, " ") // Remove quebras de linha
      .trim();
  }

  /**
   * Sanitiza dados sensíveis para não expor informações críticas nos logs
   * @param data Objeto com dados a serem sanitizados
   * @returns Objeto com dados sanitizados
   */
  private sanitizeSensitiveData(data: any): any {
    if (!data || typeof data !== "object") return data;

    // Lista de campos sensíveis que devem ser mascarados
    const sensitiveFields = [
      "password",
      "senha",
      "token",
      "secret",
      "apiKey",
      "api_key",
      "accessToken",
      "refreshToken",
      "credit_card",
      "card_number",
      "authorization",
      "key",
      "private",
      "credential",
    ];

    // Cria uma cópia para não modificar o original
    const sanitized = { ...data };

    // Função recursiva para sanitizar objetos aninhados
    const sanitizeRecursively = (obj: any): any => {
      if (!obj || typeof obj !== "object") return obj;

      // Cópia para evitar mutação do original
      const result = Array.isArray(obj) ? [...obj] : { ...obj };

      Object.keys(result).forEach((key) => {
        const lowerKey = key.toLowerCase();

        // Verifica se é um campo sensível
        if (sensitiveFields.some((field) => lowerKey.includes(field))) {
          result[key] = "[REDACTED]";
        }
        // Processa recursivamente se for um objeto ou array
        else if (result[key] && typeof result[key] === "object") {
          result[key] = sanitizeRecursively(result[key]);
        }
      });

      return result;
    };

    return sanitizeRecursively(sanitized);
  }

  /**
   * Verifica se um determinado nível de log deve ser registrado
   * com base na configuração de nível mínimo
   * @param level Nível a ser verificado
   * @returns true se o log deve ser registrado, false caso contrário
   */
  private shouldLog(level: LogLevel): boolean {
    const minLevelValue = this.logLevelValues[this.options.minLevel];
    const currentLevelValue = this.logLevelValues[level];

    return currentLevelValue >= minLevelValue;
  }

  /**
   * Registra uma mensagem de log
   * @param level Nível do log
   * @param message Mensagem a ser registrada
   * @param data Dados adicionais para incluir no log
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // Verifica se este nível de log deve ser registrado
    if (!this.shouldLog(level)) return;

    const levelConfig = LOG_LEVELS[level];
    const logMessage = this.formatLogMessage(level, message, data);

    // Exibe no console se configurado
    if (levelConfig.console && !this.options.disableConsole) {
      console.log(levelConfig.color(logMessage));
    }

    // Grava em arquivo se configurado
    if (levelConfig.file && !this.options.disableFiles) {
      const fileType = LOG_FILE_MAPPING[level];
      const stream = this.streams.get(fileType);

      if (stream && stream.writable) {
        stream.write(`${logMessage}\n`);
      }
    }
  }

  /**
   * Exibe um banner informativo com detalhes da aplicação e ambiente
   * @param connections Status das conexões com serviços externos
   */
  public showBanner(connections: ConnectionStatus = {}): void {
    if (this.options.disableConsole) return;

    const envColor = env.isDevelopment
      ? chalk.yellow
      : env.isProduction
      ? chalk.green
      : chalk.blue;

    const statusSymbols = {
      connected: chalk.green("✓"),
      disconnected: chalk.red("✗"),
    };

    // Formata o status de uma conexão
    const formatStatus = (isConnected?: boolean) =>
      isConnected
        ? `${statusSymbols.connected} Conectado`
        : `${statusSymbols.disconnected} Desconectado`;

    // Memória e uptime
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const uptime = process.uptime();

    // Estilo e cores consistentes
    const titleStyle = chalk.cyan.bold;
    const sectionStyle = chalk.cyan;
    const labelStyle = chalk.dim;
    const valueStyle = chalk.white;
    const highlightStyle = chalk.cyan;
    const separatorLine = "  " + chalk.dim("─".repeat(50));

    console.log("\n");
    console.log(titleStyle(`  🚀 ${this.projectName.toUpperCase()} `));
    console.log(valueStyle(`  ${this.projectVersion}`));
    console.log(separatorLine);

    // Seção do Sistema
    console.log(sectionStyle("\n  📊 Sistema"));
    console.log(
      `  ${labelStyle("Node.js:")}     ${valueStyle(process.version)}`
    );
    console.log(`  ${labelStyle("Ambiente:")}    ${envColor(env.nodeEnv)}`);
    console.log(
      `  ${labelStyle("Porta:")}       ${valueStyle(env.port.toString())}`
    );
    console.log(`  ${labelStyle("Hostname:")}    ${valueStyle(this.hostname)}`);
    console.log(
      `  ${labelStyle("Memória:")}     ${valueStyle(
        `${memoryUsedMB}MB / ${memoryTotalMB}MB`
      )} ${labelStyle("(utilizada/alocada)")}`
    );

    // Seção de Conexões
    console.log(sectionStyle("\n  🔌 Conexões"));
    console.log(
      `  ${labelStyle("Banco de Dados:")} ${formatStatus(
        connections.database
      )} ${
        connections.databaseConnections
          ? highlightStyle(`(${connections.databaseConnections} conexões)`)
          : ""
      }`
    );
    console.log(
      `  ${labelStyle("Redis:")}         ${formatStatus(connections.redis)}`
    );

    // Serviços adicionais, se configurados
    if (connections.kafkaConnected !== undefined) {
      console.log(
        `  ${labelStyle("Kafka:")}         ${formatStatus(
          connections.kafkaConnected
        )}`
      );
    }

    if (connections.elasticsearchConnected !== undefined) {
      console.log(
        `  ${labelStyle("Elasticsearch:")} ${formatStatus(
          connections.elasticsearchConnected
        )}`
      );
    }

    // Serviços customizados
    if (connections.customServices) {
      Object.entries(connections.customServices).forEach(([name, status]) => {
        console.log(
          `  ${labelStyle(`${name}:`)}${" ".repeat(
            Math.max(1, 14 - name.length)
          )}${formatStatus(status)}`
        );
      });
    }

    // Data de Início
    console.log(separatorLine);
    console.log(
      `  ${labelStyle("Iniciado em:")}  ${valueStyle(
        formatDate(this.startTime, "dd/MM/yyyy HH:mm:ss")
      )}`
    );
    console.log(
      `  ${labelStyle("Uptime:")}       ${valueStyle(
        this.formatUptime(uptime)
      )}`
    );

    // Informações Técnicas (apenas em desenvolvimento)
    if (env.isDevelopment) {
      console.log(sectionStyle("\n  🔧 Informações Técnicas"));
      console.log(
        `  ${labelStyle("PID:")}          ${valueStyle(process.pid.toString())}`
      );
      console.log(
        `  ${labelStyle("Plataforma:")}   ${valueStyle(process.platform)}`
      );
      console.log(
        `  ${labelStyle("Arquitetura:")}  ${valueStyle(process.arch)}`
      );

      try {
        console.log(sectionStyle("\n  📦 Dependências"));
        const dependencies = require(path.join(
          process.cwd(),
          "package.json"
        )).dependencies;
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
      } catch (error) {
        console.log(
          chalk.red(`  Erro ao carregar informações de dependências: ${error}`)
        );
      }
    }

    console.log("\n");
  }

  /**
   * Formata o tempo de uptime em um formato legível
   * @param uptime Tempo de uptime em segundos
   * @returns String formatada de uptime
   */
  private formatUptime(uptime: number): string {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(" ");
  }

  /**
   * Registra um log de acesso HTTP
   * @param method Método HTTP
   * @param path Caminho da requisição
   * @param statusCode Código de status HTTP
   * @param responseTime Tempo de resposta em ms
   * @param userAgent User-Agent do cliente
   * @param ip Endereço IP do cliente
   * @param userId ID do usuário (se autenticado)
   */
  public access(
    method: string,
    path: string,
    statusCode: number,
    responseTime: number,
    userAgent?: string,
    ip?: string,
    userId?: string
  ): void {
    // Formata mensagem principal de forma concisa
    const message = `${method} ${path} ${statusCode} ${responseTime}ms`;

    // Dados detalhados para o log
    const data = {
      userAgent,
      ip,
      userId,
      timestamp: new Date().toISOString(),
    };

    this.log("access", message, data);
  }

  /**
   * Registra uma operação de auditoria
   * @param data Dados da operação de auditoria
   */
  public audit(data: AuditData): void {
    const { action, resource, resourceId, userId } = data;

    // Formata a mensagem principal
    const message = `${action.toUpperCase()} ${resource}${
      resourceId ? ` (${resourceId})` : ""
    }`;

    // Adiciona timestamp aos dados
    const auditData = {
      ...data,
      timestamp: new Date().toISOString(),
      userId: userId || "system",
    };

    this.log("audit", message, auditData);
  }

  /**
   * Registra uma mensagem de debug
   * @param message Mensagem a ser registrada
   * @param data Dados adicionais
   */
  public debug(message: string, data?: any): void {
    this.log("debug", message, data);
  }

  /**
   * Registra uma mensagem de informação
   * @param message Mensagem a ser registrada
   * @param data Dados adicionais
   */
  public info(message: string, data?: any): void {
    this.log("info", message, data);
  }

  /**
   * Registra uma mensagem de aviso
   * @param message Mensagem a ser registrada
   * @param data Dados adicionais
   */
  public warn(message: string, data?: any): void {
    this.log("warn", message, data);
  }

  /**
   * Registra uma mensagem de erro
   * @param message Mensagem descritiva do erro
   * @param error Objeto de erro ou dados adicionais
   */
  public error(message: string, error?: Error | any): void {
    // Extrai informações úteis de objetos de erro
    const errorData =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            // Para erros específicos com propriedades adicionais
            ...(error as any),
          }
        : error;

    this.log("error", message, errorData);
  }

  /**
   * Fecha todos os streams de log de forma segura
   */
  public closeStreams(): void {
    this.streams.forEach((stream, name) => {
      try {
        // Registra o encerramento da sessão de log
        const endMessage = this.formatLogMessage(
          "info",
          `===== SESSÃO DE LOG ENCERRADA - ${this.projectName} v${this.projectVersion} =====`,
          { hostname: this.hostname, pid: process.pid }
        );

        stream.write(`${endMessage}\n`);
        stream.end();
      } catch (error) {
        console.error(`Erro ao fechar stream ${name}: ${error}`);
      }
    });

    this.streams.clear();
  }

  /**
   * Obtém uma instância do middleware de logging Morgan configurado
   * @returns Middleware Morgan para Express
   */
  public getMorganMiddleware() {
    const morgan = require("morgan");

    // Formato personalizado de log para Morgan
    const format =
      ":remote-addr :method :url :status :res[content-length] - :response-time ms";

    // Stream customizado que redireciona para o nosso logger
    const stream = {
      write: (message: string) => {
        const trimmedMessage = message.trim();
        if (env.isDevelopment) {
          this.debug(`HTTP: ${trimmedMessage}`);
        }
      },
    };

    return morgan(format, { stream });
  }

  /**
   * Middleware para logging de erros no Express
   */
  public errorMiddleware = (
    err: Error,
    req: any,
    res: any,
    next: any
  ): void => {
    const method = req.method || "UNKNOWN";
    const url = req.url || "UNKNOWN";
    const statusCode = res.statusCode || 500;
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const userId = req.user?.id || "anonymous";

    this.error(
      `${method} ${url} - Erro processando requisição (${statusCode})`,
      {
        error: err,
        request: {
          method,
          url,
          ip,
          userId,
          headers: this.sanitizeSensitiveData(req.headers),
          query: req.query,
          params: req.params,
        },
      }
    );

    next(err);
  };
}

// Exporta uma instância do Logger
export const logger = Logger.getInstance();

// Middleware Morgan para Express
export const morganMiddleware = () => logger.getMorganMiddleware();

// Middleware para logging de erros no Express
export const errorLogger = logger.errorMiddleware;

// Exporta funções individuais para compatibilidade
export const {
  info: logInfo,
  error: logError,
  warn: logWarn,
  debug: logDebug,
} = logger;
