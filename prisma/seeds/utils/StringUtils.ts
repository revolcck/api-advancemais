/**
 * Utilitários para manipulação de strings
 */
export const StringUtils = {
  /**
   * Cria um slug a partir de um nome
   * @param name Nome para converter em slug
   * @returns Slug em formato URL-friendly
   */
  createSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^\w\s]/g, "") // Remove caracteres especiais
      .replace(/\s+/g, "-") // Substitui espaços por hífens
      .replace(/-+/g, "-") // Remove hífens duplicados
      .trim()
      .replace(/^-|-$/g, ""); // Remove hífens no início e fim
  },

  /**
   * Formata uma data no formato AAAAMMDD
   * @param date Data a ser formatada
   * @returns String no formato AAAAMMDD
   */
  formatDateYYYYMMDD(date: Date = new Date()): string {
    return date.toISOString().slice(0, 10).replace(/-/g, "");
  },

  /**
   * Trunca um texto para o tamanho desejado
   * @param text Texto a ser truncado
   * @param length Tamanho desejado
   * @returns Texto truncado com reticências
   */
  truncate(text: string, length: number = 50): string {
    if (!text || text.length <= length) return text;
    return text.substring(0, length - 3) + "...";
  },

  /**
   * Gera um texto aleatório para testes
   * @param length Tamanho desejado do texto
   * @returns Texto aleatório
   */
  randomText(length: number = 10): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Capitaliza a primeira letra de cada palavra
   * @param text Texto para capitalizar
   * @returns Texto com cada palavra começando com maiúscula
   */
  capitalize(text: string): string {
    return text
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  },

  /**
   * Remove caracteres não alfanuméricos
   * @param text Texto para limpar
   * @returns Texto apenas com caracteres alfanuméricos
   */
  alphanumeric(text: string): string {
    return text.replace(/[^a-zA-Z0-9]/g, "");
  },

  /**
   * Formata CPF ou CNPJ
   * @param value CPF ou CNPJ para formatar
   * @returns String formatada
   */
  formatDocument(value: string): string {
    // Remove caracteres não numéricos
    const numbers = value.replace(/\D/g, "");

    // Verifica se é CPF ou CNPJ pelo tamanho
    if (numbers.length === 11) {
      // CPF: 000.000.000-00
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (numbers.length === 14) {
      // CNPJ: 00.000.000/0000-00
      return numbers.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        "$1.$2.$3/$4-$5"
      );
    }

    // Se não for CPF nem CNPJ, retorna o valor original
    return value;
  },

  /**
   * Formata telefone
   * @param phone Telefone para formatar
   * @returns String formatada
   */
  formatPhone(phone: string): string {
    // Remove caracteres não numéricos
    const numbers = phone.replace(/\D/g, "");

    if (numbers.length === 11) {
      // Celular com DDD: (00) 00000-0000
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (numbers.length === 10) {
      // Telefone fixo com DDD: (00) 0000-0000
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }

    // Se não for telefone com DDD, retorna o valor original
    return phone;
  },

  /**
   * Gera uma senha aleatória
   * @param length Tamanho da senha
   * @param includeSpecialChars Se deve incluir caracteres especiais
   * @returns Senha aleatória
   */
  generatePassword(
    length: number = 10,
    includeSpecialChars: boolean = true
  ): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const specialChars = "!@#$%^&*()_+{}[]|:;<>,.?/~`-=";

    const allChars = includeSpecialChars ? chars + specialChars : chars;

    let result = "";
    for (let i = 0; i < length; i++) {
      result += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    return result;
  },
};

// Alias para compatibilidade com código existente
export const createSlug = StringUtils.createSlug;
