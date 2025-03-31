import Joi from "joi";

/**
 * Função para validar CPF
 */
const validateCPF = (cpf: string): boolean => {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/[^\d]/g, "");

  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cpf)) return false;

  // Cálculo para verificação
  let sum = 0;
  let remainder;

  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;

  // Segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;

  return true;
};

/**
 * Função para validar CNPJ
 */
const validateCNPJ = (cnpj: string): boolean => {
  // Remove caracteres não numéricos
  cnpj = cnpj.replace(/[^\d]/g, "");

  // Verifica se tem 14 dígitos
  if (cnpj.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cnpj)) return false;

  // Cálculo para verificação
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;

  // Primeiro dígito
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  // Segundo dígito
  size += 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
};

/**
 * Helper personalizado para validação de CPF/CNPJ
 */
const documentValidator = (value: string, helpers: any) => {
  const document = value.replace(/[^\d]/g, "");

  if (document.length === 11) {
    if (!validateCPF(document)) {
      return helpers.error("document.invalidCPF");
    }
  } else if (document.length === 14) {
    if (!validateCNPJ(document)) {
      return helpers.error("document.invalidCNPJ");
    }
  } else {
    return helpers.error("document.invalidFormat");
  }

  return value;
};

/**
 * Schema para validação de login
 */
export const loginSchema = Joi.object({
  document: Joi.string().required().custom(documentValidator).messages({
    "string.empty": "Documento (CPF/CNPJ) é obrigatório",
    "any.required": "Documento (CPF/CNPJ) é obrigatório",
    "document.invalidFormat": "Formato de documento inválido",
    "document.invalidCPF": "CPF inválido",
    "document.invalidCNPJ": "CNPJ inválido",
  }),

  password: Joi.string().min(8).required().messages({
    "string.min": "Senha deve ter no mínimo {#limit} caracteres",
    "string.empty": "Senha é obrigatória",
    "any.required": "Senha é obrigatória",
  }),
});

/**
 * Schema para validação de refresh token
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "string.empty": "Token de atualização é obrigatório",
    "any.required": "Token de atualização é obrigatório",
  }),
});

/**
 * Schema para endereço
 */
const addressSchema = Joi.object({
  zipCode: Joi.string()
    .required()
    .pattern(/^\d{5}-?\d{3}$|^\d{8}$/)
    .messages({
      "string.pattern.base": "CEP deve estar no formato 12345-678 ou 12345678",
      "string.empty": "CEP é obrigatório",
      "any.required": "CEP é obrigatório",
    }),
  street: Joi.string().required().messages({
    "string.empty": "Rua é obrigatória",
    "any.required": "Rua é obrigatória",
  }),
  number: Joi.string().required().messages({
    "string.empty": "Número é obrigatório",
    "any.required": "Número é obrigatório",
  }),
  neighborhood: Joi.string().required().messages({
    "string.empty": "Bairro é obrigatório",
    "any.required": "Bairro é obrigatório",
  }),
  complement: Joi.string().allow(null, ""),
  city: Joi.string().required().messages({
    "string.empty": "Cidade é obrigatória",
    "any.required": "Cidade é obrigatória",
  }),
  state: Joi.string().required().length(2).messages({
    "string.empty": "Estado é obrigatório",
    "string.length": "Estado deve ter 2 caracteres (sigla)",
    "any.required": "Estado é obrigatório",
  }),
  country: Joi.string().default("Brasil"),
});

/**
 * Schema base para registro de usuário
 */
const baseRegisterSchema = {
  email: Joi.string().email().required().messages({
    "string.email": "Email deve ser um endereço de email válido",
    "string.empty": "Email é obrigatório",
    "any.required": "Email é obrigatório",
  }),

  password: Joi.string()
    .min(8)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/
    )
    .required()
    .messages({
      "string.min": "Senha deve ter no mínimo {#limit} caracteres",
      "string.pattern.base":
        "Senha deve conter pelo menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial",
      "string.empty": "Senha é obrigatória",
      "any.required": "Senha é obrigatória",
    }),

  roleId: Joi.string().uuid().allow(null, ""),

  address: addressSchema.optional(),
};

/**
 * Schema para validação de registro de pessoa física
 */
export const registerPessoaFisicaSchema = Joi.object({
  ...baseRegisterSchema,

  name: Joi.string().min(3).max(100).required().messages({
    "string.min": "Nome deve ter no mínimo {#limit} caracteres",
    "string.max": "Nome deve ter no máximo {#limit} caracteres",
    "string.empty": "Nome é obrigatório",
    "any.required": "Nome é obrigatório",
  }),

  cpf: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!validateCPF(value)) {
        return helpers.error("document.invalidCPF");
      }
      return value;
    })
    .messages({
      "string.empty": "CPF é obrigatório",
      "any.required": "CPF é obrigatório",
      "document.invalidCPF": "CPF inválido",
    }),

  rg: Joi.string().allow(null, ""),

  birthDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Data de nascimento deve estar no formato YYYY-MM-DD",
      "string.empty": "Data de nascimento é obrigatória",
      "any.required": "Data de nascimento é obrigatória",
    }),

  gender: Joi.string()
    .valid("MASCULINO", "FEMININO", "OUTRO", "NAO_INFORMADO")
    .required()
    .messages({
      "string.empty": "Gênero é obrigatório",
      "any.required": "Gênero é obrigatório",
      "any.only":
        "Gênero deve ser um dos seguintes: MASCULINO, FEMININO, OUTRO, NAO_INFORMADO",
    }),

  phone: Joi.string()
    .pattern(/^\+?[0-9]{10,15}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Telefone deve estar no formato: +5511999999999 ou 11999999999",
      "string.empty": "Telefone é obrigatório",
      "any.required": "Telefone é obrigatório",
    }),

  companyName: Joi.string().allow(null, ""),

  maritalStatus: Joi.string()
    .valid(
      "SOLTEIRO",
      "CASADO",
      "DIVORCIADO",
      "VIUVO",
      "UNIAO_ESTAVEL",
      "OUTRO"
    )
    .allow(null, "")
    .messages({
      "any.only":
        "Estado civil deve ser um dos seguintes: SOLTEIRO, CASADO, DIVORCIADO, VIUVO, UNIAO_ESTAVEL, OUTRO",
    }),
});

/**
 * Schema para validação de registro de pessoa jurídica
 */
export const registerPessoaJuridicaSchema = Joi.object({
  ...baseRegisterSchema,

  companyName: Joi.string().required().messages({
    "string.empty": "Nome da empresa é obrigatório",
    "any.required": "Nome da empresa é obrigatório",
  }),

  tradeName: Joi.string().required().messages({
    "string.empty": "Nome fantasia é obrigatório",
    "any.required": "Nome fantasia é obrigatório",
  }),

  legalName: Joi.string().required().messages({
    "string.empty": "Razão social é obrigatória",
    "any.required": "Razão social é obrigatória",
  }),

  cnpj: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!validateCNPJ(value)) {
        return helpers.error("document.invalidCNPJ");
      }
      return value;
    })
    .messages({
      "string.empty": "CNPJ é obrigatório",
      "any.required": "CNPJ é obrigatório",
      "document.invalidCNPJ": "CNPJ inválido",
    }),

  phone: Joi.string()
    .pattern(/^\+?[0-9]{10,15}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Telefone deve estar no formato: +5511999999999 ou 11999999999",
      "string.empty": "Telefone é obrigatório",
      "any.required": "Telefone é obrigatório",
    }),

  website: Joi.string().uri().allow(null, "").messages({
    "string.uri": "Website deve ser uma URL válida",
  }),
});

/**
 * Schema para validação de alteração de senha
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "string.empty": "Senha atual é obrigatória",
    "any.required": "Senha atual é obrigatória",
  }),

  newPassword: Joi.string()
    .min(8)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/
    )
    .required()
    .invalid(Joi.ref("currentPassword")) // Nova senha não pode ser igual à atual
    .messages({
      "string.min": "Nova senha deve ter no mínimo {#limit} caracteres",
      "string.pattern.base":
        "Nova senha deve conter pelo menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial",
      "string.empty": "Nova senha é obrigatória",
      "any.required": "Nova senha é obrigatória",
      "any.invalid": "Nova senha não pode ser igual à senha atual",
    }),
});
