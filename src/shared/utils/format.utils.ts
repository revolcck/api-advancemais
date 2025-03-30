/**
 * Formata um valor numérico para moeda (R$)
 * @param value Valor a ser formatado
 * @param currency Código da moeda (padrão: BRL)
 * @returns String formatada com símbolo da moeda
 */
export function formatCurrency(
  value: number,
  currency: string = "BRL"
): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formata um número de telefone para exibição
 * @param phone Número de telefone (formato: +5511999999999)
 * @returns Telefone formatado (ex: (11) 99999-9999)
 */
export function formatPhone(phone: string): string {
  if (!phone) return "";

  // Remove todos os caracteres não numéricos, exceto o '+'
  const cleaned = phone.replace(/[^\d+]/g, "");

  // Se começar com '+55' (Brasil)
  if (cleaned.startsWith("+55")) {
    const ddd = cleaned.substring(3, 5);
    const firstPart = cleaned.substring(5, 10);
    const secondPart = cleaned.substring(10, 14);

    return secondPart
      ? `(${ddd}) ${firstPart}-${secondPart}`
      : `(${ddd}) ${firstPart}`;
  }

  // Para outros formatos, retorna como está
  return cleaned;
}

/**
 * Formata um CPF para exibição
 * @param cpf CPF sem formatação (11 dígitos)
 * @returns CPF formatado (ex: 123.456.789-09)
 */
export function formatCPF(cpf: string): string {
  if (!cpf || cpf.length !== 11) return cpf;

  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * Formata um CNPJ para exibição
 * @param cnpj CNPJ sem formatação (14 dígitos)
 * @returns CNPJ formatado (ex: 12.345.678/0001-90)
 */
export function formatCNPJ(cnpj: string): string {
  if (!cnpj || cnpj.length !== 14) return cnpj;

  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

/**
 * Formata um documento (CPF ou CNPJ) automaticamente
 * @param doc Documento sem formatação
 * @returns Documento formatado
 */
export function formatDocument(doc: string): string {
  if (!doc) return "";

  const cleaned = doc.replace(/\D/g, "");

  if (cleaned.length === 11) {
    return formatCPF(cleaned);
  } else if (cleaned.length === 14) {
    return formatCNPJ(cleaned);
  }

  return cleaned;
}

/**
 * Formata uma data para string no formato brasileiro
 * @param date Data a ser formatada
 * @param includeTime Incluir hora na formatação
 * @returns Data formatada (ex: 31/12/2023 ou 31/12/2023 23:59)
 */
export function formatDate(
  date: Date | string,
  includeTime: boolean = false
): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  const day = dateObj.getDate().toString().padStart(2, "0");
  const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const year = dateObj.getFullYear();

  const dateStr = `${day}/${month}/${year}`;

  if (includeTime) {
    const hours = dateObj.getHours().toString().padStart(2, "0");
    const minutes = dateObj.getMinutes().toString().padStart(2, "0");
    return `${dateStr} ${hours}:${minutes}`;
  }

  return dateStr;
}
