import { randomBytes } from "crypto";
import argon2 from "argon2";

/**
 * Configurações para o algoritmo Argon2
 */
interface Argon2Options {
  memoryCost: number;
  timeCost: number;
  parallelism: number;
}

/**
 * Resultado da validação de uma senha
 */
interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Classe utilitária para manipulação de hashes de senha usando Argon2
 *
 * Argon2id foi selecionado por ser o vencedor da competição de hashing de senhas
 * e combinar proteção contra ataques de canal lateral e de GPU
 */
export class HashUtils {
  /**
   * Configurações padrão para o Argon2
   * @private
   * @readonly
   */
  private static readonly DEFAULT_OPTIONS: Argon2Options = {
    memoryCost: 19456, // 19MB
    timeCost: 2,
    parallelism: 1,
  };

  /**
   * Requisitos de senha
   * @private
   * @readonly
   */
  private static readonly PASSWORD_REQUIREMENTS = {
    minLength: 8,
    requireUpperCase: true,
    requireLowerCase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  };

  /**
   * Caracteres usados para geração de senhas aleatórias
   * @private
   * @readonly
   */
  private static readonly CHAR_SETS = {
    upperCase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowerCase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    specialChars: "!@#$%^&*()_+-=[]{}|;:,.<>?",
  };

  /**
   * Gera um hash para uma senha usando Argon2id
   *
   * @param password - Senha em texto puro
   * @param options - Opções personalizadas para o algoritmo (opcional)
   * @returns Promise com a senha hasheada
   * @throws Error se ocorrer um problema durante o hashing
   */
  public static async hash(
    password: string,
    options?: Partial<Argon2Options>
  ): Promise<string> {
    try {
      const hashOptions = {
        type: argon2.argon2id,
        memoryCost: options?.memoryCost ?? this.DEFAULT_OPTIONS.memoryCost,
        timeCost: options?.timeCost ?? this.DEFAULT_OPTIONS.timeCost,
        parallelism: options?.parallelism ?? this.DEFAULT_OPTIONS.parallelism,
      };

      return await argon2.hash(password, hashOptions);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Falha ao gerar hash da senha: ${errorMessage}`);
    }
  }

  /**
   * Verifica se uma senha em texto puro corresponde a um hash
   *
   * @param password - Senha em texto puro
   * @param hash - Hash a ser comparado
   * @returns Promise com boolean que indica se a senha corresponde ao hash
   * @throws Error se ocorrer um problema durante a verificação
   */
  public static async compare(
    password: string,
    hash: string
  ): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Falha ao verificar senha: ${errorMessage}`);
    }
  }

  /**
   * Valida se uma senha atende aos requisitos mínimos de segurança
   *
   * @param password - Senha a ser validada
   * @returns Resultado da validação com status e eventuais erros
   */
  public static validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    const requirements = this.PASSWORD_REQUIREMENTS;

    // Verifica comprimento mínimo
    if (password.length < requirements.minLength) {
      errors.push(
        `A senha deve ter pelo menos ${requirements.minLength} caracteres`
      );
    }

    // Verifica presença de letra maiúscula
    if (requirements.requireUpperCase && !/[A-Z]/.test(password)) {
      errors.push("A senha deve conter pelo menos uma letra maiúscula");
    }

    // Verifica presença de letra minúscula
    if (requirements.requireLowerCase && !/[a-z]/.test(password)) {
      errors.push("A senha deve conter pelo menos uma letra minúscula");
    }

    // Verifica presença de números
    if (requirements.requireNumbers && !/[0-9]/.test(password)) {
      errors.push("A senha deve conter pelo menos um número");
    }

    // Verifica presença de caracteres especiais
    if (
      requirements.requireSpecialChars &&
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
      errors.push("A senha deve conter pelo menos um caractere especial");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Verifica se uma senha atende aos requisitos mínimos de segurança
   *
   * @deprecated Use validatePassword para obter detalhes sobre falhas
   * @param password - Senha a ser verificada
   * @returns Verdadeiro se a senha for considerada forte
   */
  public static isStrongPassword(password: string): boolean {
    const validation = this.validatePassword(password);
    return validation.isValid;
  }

  /**
   * Gera uma senha aleatória segura que atende aos requisitos mínimos
   *
   * @param length - Comprimento da senha (mínimo 8, padrão 12)
   * @returns Senha gerada aleatoriamente
   * @throws Error se a geração falhar ou o comprimento for insuficiente
   */
  public static generateRandomPassword(length = 12): string {
    if (length < this.PASSWORD_REQUIREMENTS.minLength) {
      length = this.PASSWORD_REQUIREMENTS.minLength;
    }

    const { upperCase, lowerCase, numbers, specialChars } = this.CHAR_SETS;

    try {
      // Garante pelo menos um caractere de cada tipo necessário
      let password = "";

      if (this.PASSWORD_REQUIREMENTS.requireUpperCase) {
        password += this.getRandomCharFrom(upperCase);
      }

      if (this.PASSWORD_REQUIREMENTS.requireLowerCase) {
        password += this.getRandomCharFrom(lowerCase);
      }

      if (this.PASSWORD_REQUIREMENTS.requireNumbers) {
        password += this.getRandomCharFrom(numbers);
      }

      if (this.PASSWORD_REQUIREMENTS.requireSpecialChars) {
        password += this.getRandomCharFrom(specialChars);
      }

      // Caracteres garantidos até agora
      const guaranteedCharsCount = password.length;

      // Conjunto completo para os caracteres restantes
      const allChars = [
        ...(this.PASSWORD_REQUIREMENTS.requireUpperCase ? upperCase : []),
        ...(this.PASSWORD_REQUIREMENTS.requireLowerCase ? lowerCase : []),
        ...(this.PASSWORD_REQUIREMENTS.requireNumbers ? numbers : []),
        ...(this.PASSWORD_REQUIREMENTS.requireSpecialChars ? specialChars : []),
      ].join("");

      // Gera os caracteres restantes de forma segura
      const remainingLength = length - guaranteedCharsCount;
      const randomBytes = this.generateSecureRandomBytes(remainingLength * 2); // Extra bytes para garantir

      for (let i = 0; i < remainingLength; i++) {
        const randomIndex = randomBytes[i] % allChars.length;
        password += allChars[randomIndex];
      }

      // Embaralha os caracteres para evitar um padrão previsível
      return this.shuffleString(password);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Falha ao gerar senha aleatória: ${errorMessage}`);
    }
  }

  /**
   * Retorna um caractere aleatório de uma string
   *
   * @private
   * @param charSet - Conjunto de caracteres para escolha
   * @returns Caractere aleatório do conjunto
   */
  private static getRandomCharFrom(charSet: string): string {
    const randomBytes = this.generateSecureRandomBytes(1);
    const index = randomBytes[0] % charSet.length;
    return charSet.charAt(index);
  }

  /**
   * Gera bytes aleatórios de forma segura usando crypto.randomBytes
   *
   * @private
   * @param count - Número de bytes a gerar
   * @returns Array de bytes
   */
  private static generateSecureRandomBytes(count: number): Uint8Array {
    return randomBytes(count);
  }

  /**
   * Embaralha os caracteres de uma string de forma segura
   *
   * @private
   * @param str - String a ser embaralhada
   * @returns String embaralhada
   */
  private static shuffleString(str: string): string {
    const arr = str.split("");
    const randomBytes = this.generateSecureRandomBytes(arr.length * 2);

    // Fisher-Yates shuffle moderno com fonte de aleatoriedade criptográfica
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randomBytes[i] % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]]; // Troca de elementos
    }

    return arr.join("");
  }
}
