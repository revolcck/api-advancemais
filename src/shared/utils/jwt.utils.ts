import * as jose from "jose";
import { env } from "@/config/environment";

/**
 * Interface para payload do token JWT
 */
export interface TokenPayload {
  sub: string; // ID do usuário
  name?: string; // Nome do usuário
  email?: string; // Email do usuário
  role?: string; // Papel do usuário
  [key: string]: any; // Propriedades adicionais
}

/**
 * Resultado da verificação de um token
 */
export interface VerifyResult {
  valid: boolean; // Se o token é válido
  expired: boolean; // Se o token está expirado
  payload?: TokenPayload; // Payload do token, se válido
}

/**
 * Classe para gerenciamento de tokens JWT
 * Fornece métodos para geração, validação e refresh de tokens
 */
export class JwtUtils {
  /**
   * Chave secreta compartilhada para assinar tokens
   * Convertida para TextEncoder para compatibilidade com jose
   */
  private static secretKey = new TextEncoder().encode(env.jwt.secret);

  /**
   * Gera um token JWT de acesso
   * @param payload Dados a serem incluídos no token
   * @returns Token JWT gerado
   */
  public static async generateAccessToken(
    payload: TokenPayload
  ): Promise<string> {
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(env.jwt.expiresIn)
      .setSubject(payload.sub)
      .sign(this.secretKey);

    return jwt;
  }

  /**
   * Gera um token JWT para refresh
   * @param userId ID do usuário
   * @returns Token JWT de refresh
   */
  public static async generateRefreshToken(userId: string): Promise<string> {
    const jwt = await new jose.SignJWT({ type: "refresh" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(env.jwt.refreshExpiresIn)
      .setSubject(userId)
      .sign(this.secretKey);

    return jwt;
  }

  /**
   * Verifica se um token JWT é válido
   * @param token Token JWT a ser verificado
   * @returns Resultado da verificação
   */
  public static async verifyToken(token: string): Promise<VerifyResult> {
    try {
      // Verifica a assinatura e validade do token
      const { payload } = await jose.jwtVerify(token, this.secretKey, {
        algorithms: ["HS256"],
      });

      // Converte o payload para o formato esperado
      const tokenPayload: TokenPayload = {
        sub: payload.sub as string,
        ...payload,
      };

      return {
        valid: true,
        expired: false,
        payload: tokenPayload,
      };
    } catch (error) {
      // Captura erros específicos para fornecer feedback mais preciso
      if (error instanceof jose.errors.JWTExpired) {
        return {
          valid: false,
          expired: true,
        };
      }

      // Qualquer outro erro de validação
      return {
        valid: false,
        expired: false,
      };
    }
  }

  /**
   * Decodifica um token JWT sem verificar a assinatura
   * Útil para debugging ou quando a verificação já ocorreu
   * @param token Token JWT a ser decodificado
   * @returns Payload do token ou null se inválido
   */
  public static decodeToken(token: string): TokenPayload | null {
    try {
      // Decodifica o token sem verificar a assinatura
      const decoded = jose.decodeJwt(token);

      return {
        sub: decoded.sub as string,
        ...decoded,
      };
    } catch {
      return null;
    }
  }
}
