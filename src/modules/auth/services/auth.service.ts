import { prisma } from "@/config/database";
import { redisService } from "@/config/redis";
import { env } from "@/config/environment";
import { HashUtils } from "@/shared/utils/hash.utils";
import { JwtUtils } from "@/shared/utils/jwt.utils";
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from "@/shared/errors/AppError";
import {
  LoginRequestDto,
  LoginResponseDto,
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
  RegisterRequestDto,
  RegisterResponseDto,
  ChangePasswordRequestDto,
  SuccessResponseDto,
} from "../dto/auth.dto";
import { logger } from "@/shared/utils/logger.utils";
import { AuditService, AuditAction } from "@/shared/services/audit.service";
import { ValidationError } from "@/shared/errors/AppError";
/**
 * Classe de serviço que implementa a lógica de autenticação
 * Responsável por autenticar usuários, gerar e validar tokens, etc.
 */
export class AuthService {
  /**
   * Prefixo para chaves de token de blacklist no Redis
   */
  private static readonly BLACKLIST_PREFIX = "token:blacklist:";

  /**
   * TTL para tokens na blacklist (em segundos)
   * Deve ser maior que o tempo de expiração do token de acesso
   */
  private static readonly BLACKLIST_TTL = 60 * 60 * 24 * 7; // 7 dias

  /**
   * Autentica um usuário e retorna tokens de acesso e refresh
   * @param data Dados de login (email e senha)
   * @returns Tokens de acesso e refresh e dados do usuário
   */
  public async login(data: LoginRequestDto): Promise<LoginResponseDto> {
    try {
      logger.info(`Tentativa de login para o usuário: ${data.email}`);

      // Busca o usuário pelo email
      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      // Verifica se o usuário existe
      if (!user) {
        logger.warn(
          `Falha no login: usuário não encontrado para ${data.email}`
        );
        AuditService.log(
          "login_failed",
          "authentication",
          undefined,
          undefined,
          { email: data.email, reason: "user_not_found" }
        );
        throw new UnauthorizedError("Credenciais inválidas");
      }

      // Verifica se a senha está correta
      const isPasswordValid = await HashUtils.compare(
        data.password,
        user.password
      );

      if (!isPasswordValid) {
        logger.warn(`Falha no login: senha incorreta para ${user.email}`);
        AuditService.log("login_failed", "authentication", undefined, user.id, {
          reason: "invalid_password",
        });
        throw new UnauthorizedError("Credenciais inválidas");
      }

      logger.debug(`Gerando tokens para usuário ${user.id}`);

      // Gera tokens
      const accessToken = await this.generateAccessToken(
        user.id,
        user.email,
        user.role
      );
      const refreshToken = await this.generateRefreshToken(user.id);

      // Atualiza o refresh token no banco de dados
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
      });
      logger.debug(`Refresh token atualizado no banco para usuário ${user.id}`);

      // Registra log de auditoria para login bem-sucedido
      AuditService.log(
        AuditAction.LOGIN,
        "authentication",
        undefined,
        user.id,
        { role: user.role }
      );
      logger.info(`Login bem-sucedido para ${user.email}`, {
        userId: user.id,
        role: user.role,
      });

      // Retorna os tokens e dados do usuário
      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      // Captura erros não esperados durante o login
      if (!(error instanceof UnauthorizedError)) {
        logger.error(`Erro inesperado durante login para ${data.email}`, error);
      }
      throw error;
    }
  }

  /**
   * Registra um novo usuário
   * @param data Dados do novo usuário
   * @returns Dados do usuário registrado
   */
  public async register(
    data: RegisterRequestDto
  ): Promise<RegisterResponseDto> {
    try {
      logger.info(`Tentativa de registro para o email: ${data.email}`);

      // Verifica se já existe um usuário com o mesmo email
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        logger.warn(`Falha no registro: email ${data.email} já está em uso`);
        AuditService.log("register_failed", "user", undefined, undefined, {
          email: data.email,
          reason: "email_in_use",
        });
        throw new ConflictError("Email já está em uso");
      }

      // Verifica força da senha
      if (!HashUtils.isStrongPassword(data.password)) {
        logger.warn(`Falha no registro: senha fraca para ${data.email}`);
        AuditService.log("register_failed", "user", undefined, undefined, {
          email: data.email,
          reason: "weak_password",
        });
        throw new ValidationError(
          "Senha não atende aos requisitos de segurança"
        );
      }

      // Hash da senha
      logger.debug(`Gerando hash da senha para ${data.email}`);
      const hashedPassword = await HashUtils.hash(data.password);

      // Cria o usuário
      logger.debug(`Criando novo usuário para ${data.email}`);
      const user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: "USER", // Papel padrão para novos usuários
        },
      });

      // Registra log de auditoria para registro bem-sucedido
      AuditService.log(AuditAction.REGISTER, "user", user.id, user.id, {
        name: user.name,
        email: user.email,
        role: user.role,
      });
      logger.info(`Usuário registrado com sucesso: ${user.email}`, {
        userId: user.id,
        role: user.role,
      });

      // Retorna os dados do usuário registrado
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      };
    } catch (error) {
      // Registra erros inesperados
      if (!(error instanceof ConflictError)) {
        logger.error(
          `Erro inesperado durante registro para ${data.email}`,
          error
        );
      }
      throw error;
    }
  }

  /**
   * Atualiza o token de acesso usando o token de refresh
   * @param data Token de refresh
   * @returns Novos tokens de acesso e refresh
   */
  public async refreshToken(
    data: RefreshTokenRequestDto
  ): Promise<RefreshTokenResponseDto> {
    try {
      logger.debug(`Tentativa de refresh de token`);

      // Verifica se o token está na blacklist
      const isBlacklisted = await this.isTokenBlacklisted(data.refreshToken);
      if (isBlacklisted) {
        logger.warn(`Tentativa de refresh com token na blacklist`);
        AuditService.log(
          "token_refresh_failed",
          "authentication",
          undefined,
          undefined,
          { reason: "blacklisted_token" }
        );
        throw new UnauthorizedError("Token inválido");
      }

      // Verifica se o token é válido
      const verifyResult = await JwtUtils.verifyToken(data.refreshToken);

      if (!verifyResult.valid) {
        logger.warn(`Tentativa de refresh com token inválido ou expirado`);
        AuditService.log(
          "token_refresh_failed",
          "authentication",
          undefined,
          undefined,
          { reason: verifyResult.expired ? "expired_token" : "invalid_token" }
        );
        throw new UnauthorizedError("Token inválido ou expirado");
      }

      const userId = verifyResult.payload?.sub;

      if (!userId) {
        logger.warn(`Tentativa de refresh com token sem usuário`);
        AuditService.log(
          "token_refresh_failed",
          "authentication",
          undefined,
          undefined,
          { reason: "missing_user_id" }
        );
        throw new UnauthorizedError("Token inválido");
      }

      // Busca o usuário
      logger.debug(`Buscando usuário ${userId} para refresh de token`);
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        logger.warn(
          `Usuário não encontrado durante refresh de token: ${userId}`
        );
        AuditService.log(
          "token_refresh_failed",
          "authentication",
          undefined,
          userId,
          { reason: "user_not_found" }
        );
        throw new NotFoundError("Usuário");
      }

      // Verifica se o token corresponde ao armazenado no banco
      if (user.refreshToken !== data.refreshToken) {
        logger.warn(
          `Token de refresh não corresponde ao armazenado para usuário ${userId}`
        );
        AuditService.log(
          "token_refresh_failed",
          "authentication",
          undefined,
          userId,
          { reason: "token_mismatch" }
        );
        throw new UnauthorizedError("Token inválido");
      }

      // Gera novos tokens
      logger.debug(`Gerando novos tokens para usuário ${userId}`);
      const accessToken = await this.generateAccessToken(
        user.id,
        user.email,
        user.role
      );
      const refreshToken = await this.generateRefreshToken(user.id);

      // Atualiza o refresh token no banco de dados
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
      });

      // Adiciona o token antigo à blacklist
      await this.blacklistToken(data.refreshToken);
      logger.debug(
        `Token antigo adicionado à blacklist para usuário ${userId}`
      );

      // Registra log de auditoria para refresh bem-sucedido
      AuditService.log(
        AuditAction.TOKEN_REFRESH,
        "authentication",
        undefined,
        userId,
        { role: user.role }
      );
      logger.info(`Token atualizado com sucesso para usuário ${userId}`);

      // Retorna os novos tokens
      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      // Registra erros inesperados
      if (
        !(error instanceof UnauthorizedError) &&
        !(error instanceof NotFoundError)
      ) {
        logger.error(`Erro inesperado durante refresh de token`, error);
      }
      throw error;
    }
  }

  /**
   * Realiza o logout do usuário, invalidando seus tokens
   * @param userId ID do usuário
   * @param refreshToken Token de refresh atual
   * @returns Resposta de sucesso
   */
  public async logout(
    userId: string,
    refreshToken: string
  ): Promise<SuccessResponseDto> {
    try {
      logger.info(`Iniciando logout para usuário ID: ${userId}`);

      // Adiciona o token à blacklist
      await this.blacklistToken(refreshToken);
      logger.debug(`Token adicionado à blacklist para usuário ${userId}`);

      // Remove o refresh token do usuário
      await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
      logger.debug(`Refresh token removido do banco para usuário ${userId}`);

      // Registra log de auditoria para logout
      AuditService.log(AuditAction.LOGOUT, "authentication", undefined, userId);
      logger.info(`Logout concluído com sucesso para usuário ${userId}`);

      return {
        success: true,
        message: "Logout realizado com sucesso",
      };
    } catch (error) {
      logger.error(`Erro durante logout para usuário ${userId}`, error);
      throw error;
    }
  }

  /**
   * Altera a senha do usuário
   * @param userId ID do usuário
   * @param data Senha atual e nova senha
   * @returns Resposta de sucesso
   */
  public async changePassword(
    userId: string,
    data: ChangePasswordRequestDto
  ): Promise<SuccessResponseDto> {
    try {
      logger.info(`Tentativa de alteração de senha para usuário ID: ${userId}`);

      // Busca o usuário
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        logger.warn(
          `Usuário não encontrado durante alteração de senha: ${userId}`
        );
        AuditService.log("password_change_failed", "user", userId, userId, {
          reason: "user_not_found",
        });
        throw new NotFoundError("Usuário");
      }

      // Verifica se a senha atual está correta
      const isPasswordValid = await HashUtils.compare(
        data.currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        logger.warn(
          `Senha atual incorreta durante alteração de senha para usuário ${userId}`
        );
        AuditService.log("password_change_failed", "user", userId, userId, {
          reason: "incorrect_current_password",
        });
        throw new UnauthorizedError("Senha atual incorreta");
      }

      // Verifica força da nova senha
      if (!HashUtils.isStrongPassword(data.newPassword)) {
        logger.warn(
          `Nova senha fraca durante alteração de senha para usuário ${userId}`
        );
        AuditService.log("password_change_failed", "user", userId, userId, {
          reason: "weak_password",
        });
        throw new ValidationError(
          "Nova senha não atende aos requisitos de segurança"
        );
      }

      // Hash da nova senha
      logger.debug(`Gerando hash da nova senha para usuário ${userId}`);
      const hashedPassword = await HashUtils.hash(data.newPassword);

      // Atualiza a senha
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      logger.debug(`Senha atualizada no banco para usuário ${userId}`);

      // Invalida todos os tokens de refresh do usuário
      if (user.refreshToken) {
        await this.blacklistToken(user.refreshToken);
        await prisma.user.update({
          where: { id: userId },
          data: { refreshToken: null },
        });
        logger.debug(
          `Tokens invalidados após alteração de senha para usuário ${userId}`
        );
      }

      // Registra log de auditoria para alteração de senha
      AuditService.log(AuditAction.PASSWORD_CHANGE, "user", userId, userId);
      logger.info(`Senha alterada com sucesso para usuário ${userId}`);

      return {
        success: true,
        message: "Senha alterada com sucesso",
      };
    } catch (error) {
      // Registra erros inesperados
      if (
        !(error instanceof UnauthorizedError) &&
        !(error instanceof NotFoundError) &&
        !(error instanceof ValidationError)
      ) {
        logger.error(
          `Erro inesperado durante alteração de senha para usuário ${userId}`,
          error
        );
      }
      throw error;
    }
  }

  /**
   * Gera um token de acesso para o usuário
   * @param userId ID do usuário
   * @param email Email do usuário
   * @param role Papel do usuário
   * @returns Token de acesso
   */
  private async generateAccessToken(
    userId: string,
    email: string,
    role: string
  ): Promise<string> {
    try {
      logger.debug(`Gerando access token para usuário ${userId}`);
      return JwtUtils.generateAccessToken({
        sub: userId,
        email,
        role,
      });
    } catch (error) {
      logger.error(`Erro ao gerar access token para usuário ${userId}`, error);
      throw error;
    }
  }

  /**
   * Gera um token de refresh para o usuário
   * @param userId ID do usuário
   * @returns Token de refresh
   */
  private async generateRefreshToken(userId: string): Promise<string> {
    try {
      logger.debug(`Gerando refresh token para usuário ${userId}`);
      return JwtUtils.generateRefreshToken(userId);
    } catch (error) {
      logger.error(`Erro ao gerar refresh token para usuário ${userId}`, error);
      throw error;
    }
  }

  /**
   * Adiciona um token à blacklist
   * @param token Token a ser adicionado
   */
  private async blacklistToken(token: string): Promise<void> {
    try {
      // Tenta decodificar o token para obter o ID do usuário para fins de log
      const decodedToken = JwtUtils.decodeToken(token);
      const userId = decodedToken?.sub || "desconhecido";

      logger.debug(`Adicionando token à blacklist para usuário ${userId}`);

      if (redisService.isConnected()) {
        const key = `${AuthService.BLACKLIST_PREFIX}${token}`;
        await redisService.set(key, "true", AuthService.BLACKLIST_TTL);
        logger.debug(
          `Token adicionado à blacklist no Redis para usuário ${userId}`
        );
      } else if (env.isDevelopment) {
        logger.warn(
          `Redis não está conectado. Ignorando blacklist em ambiente de desenvolvimento para usuário ${userId}`
        );
      } else {
        logger.error(
          `Falha ao adicionar token à blacklist: Redis não conectado`
        );
        throw new Error("Serviço Redis não está disponível");
      }
    } catch (error) {
      logger.error(`Erro ao adicionar token à blacklist`, error);

      // Em desenvolvimento, continuamos mesmo com erro
      if (!env.isDevelopment) {
        throw error;
      }
    }
  }

  /**
   * Verifica se um token está na blacklist
   * @param token Token a ser verificado
   * @returns Se o token está na blacklist
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      // Tenta decodificar o token para obter o ID do usuário para fins de log
      const decodedToken = JwtUtils.decodeToken(token);
      const userId = decodedToken?.sub || "desconhecido";

      logger.debug(
        `Verificando se token está na blacklist para usuário ${userId}`
      );

      if (redisService.isConnected()) {
        const key = `${AuthService.BLACKLIST_PREFIX}${token}`;
        const result = await redisService.exists(key);

        if (result) {
          logger.debug(`Token encontrado na blacklist para usuário ${userId}`);
        }

        return result;
      } else if (env.isDevelopment) {
        logger.warn(
          `Redis não está conectado. Ignorando verificação de blacklist em ambiente de desenvolvimento para usuário ${userId}`
        );
        return false;
      }

      // Em produção, tratamos como erro se o Redis não estiver disponível
      logger.error(
        `Falha ao verificar token na blacklist: Redis não conectado`
      );
      throw new Error("Serviço Redis não está disponível");
    } catch (error) {
      logger.error(`Erro ao verificar token na blacklist`, error);

      // Em desenvolvimento, continuamos mesmo com erro
      if (env.isDevelopment) {
        return false;
      }

      throw error;
    }
  }
}
