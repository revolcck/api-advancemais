/**
 * Serviço de autenticação
 * Implementa a lógica de negócio para operações de autenticação
 */

import { prisma } from "@/config/database";
import { redisService } from "@/config/redis";
import { HashUtils } from "@/shared/utils/hash.utils";
import { JwtUtils } from "@/shared/utils/jwt.utils";
import {
  AppError,
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
    // Busca o usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // Verifica se o usuário existe
    if (!user) {
      throw new UnauthorizedError("Credenciais inválidas");
    }

    // Verifica se a senha está correta
    const isPasswordValid = await HashUtils.compare(
      data.password,
      user.password
    );
    if (!isPasswordValid) {
      throw new UnauthorizedError("Credenciais inválidas");
    }

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
  }

  /**
   * Registra um novo usuário
   * @param data Dados do novo usuário
   * @returns Dados do usuário registrado
   */
  public async register(
    data: RegisterRequestDto
  ): Promise<RegisterResponseDto> {
    // Verifica se já existe um usuário com o mesmo email
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError("Email já está em uso");
    }

    // Hash da senha
    const hashedPassword = await HashUtils.hash(data.password);

    // Cria o usuário
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: "USER", // Papel padrão para novos usuários
      },
    });

    // Retorna os dados do usuário registrado
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  /**
   * Atualiza o token de acesso usando o token de refresh
   * @param data Token de refresh
   * @returns Novos tokens de acesso e refresh
   */
  public async refreshToken(
    data: RefreshTokenRequestDto
  ): Promise<RefreshTokenResponseDto> {
    // Verifica se o token está na blacklist
    const isBlacklisted = await this.isTokenBlacklisted(data.refreshToken);
    if (isBlacklisted) {
      throw new UnauthorizedError("Token inválido");
    }

    // Verifica se o token é válido
    const verifyResult = await JwtUtils.verifyToken(data.refreshToken);

    if (!verifyResult.valid) {
      throw new UnauthorizedError("Token inválido ou expirado");
    }

    const userId = verifyResult.payload?.sub;

    if (!userId) {
      throw new UnauthorizedError("Token inválido");
    }

    // Busca o usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("Usuário");
    }

    // Verifica se o token corresponde ao armazenado no banco
    if (user.refreshToken !== data.refreshToken) {
      throw new UnauthorizedError("Token inválido");
    }

    // Gera novos tokens
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

    // Retorna os novos tokens
    return {
      accessToken,
      refreshToken,
    };
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
    // Adiciona o token à blacklist
    await this.blacklistToken(refreshToken);

    // Remove o refresh token do usuário
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return {
      success: true,
      message: "Logout realizado com sucesso",
    };
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
    // Busca o usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("Usuário");
    }

    // Verifica se a senha atual está correta
    const isPasswordValid = await HashUtils.compare(
      data.currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      throw new UnauthorizedError("Senha atual incorreta");
    }

    // Hash da nova senha
    const hashedPassword = await HashUtils.hash(data.newPassword);

    // Atualiza a senha
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Invalida todos os tokens de refresh do usuário
    if (user.refreshToken) {
      await this.blacklistToken(user.refreshToken);
      await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
    }

    return {
      success: true,
      message: "Senha alterada com sucesso",
    };
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
    return JwtUtils.generateAccessToken({
      sub: userId,
      email,
      role,
    });
  }

  /**
   * Gera um token de refresh para o usuário
   * @param userId ID do usuário
   * @returns Token de refresh
   */
  private async generateRefreshToken(userId: string): Promise<string> {
    return JwtUtils.generateRefreshToken(userId);
  }

  /**
   * Adiciona um token à blacklist
   * @param token Token a ser adicionado
   */
  private async blacklistToken(token: string): Promise<void> {
    const key = `${AuthService.BLACKLIST_PREFIX}${token}`;
    await redisService.set(key, "true", AuthService.BLACKLIST_TTL);
  }

  /**
   * Verifica se um token está na blacklist
   * @param token Token a ser verificado
   * @returns Se o token está na blacklist
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `${AuthService.BLACKLIST_PREFIX}${token}`;
    return await redisService.exists(key);
  }
}
