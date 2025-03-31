/**
 * DTOs (Data Transfer Objects) para o módulo de autenticação
 * Define a estrutura dos dados para as operações de autenticação
 */

/**
 * DTO para requisição de login
 */
export interface LoginRequestDto {
  document: string; // CPF ou CNPJ
  password: string;
}

/**
 * DTO para resposta de login
 */
export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    document: string; // CPF ou CNPJ
    userType: string; // PESSOA_FISICA ou PESSOA_JURIDICA
    role: string;
  };
}

/**
 * DTO para requisição de refresh token
 */
export interface RefreshTokenRequestDto {
  refreshToken: string;
}

/**
 * DTO para resposta de refresh token
 */
export interface RefreshTokenResponseDto {
  accessToken: string;
  refreshToken: string;
}

/**
 * Dados comuns para registro de qualquer tipo de usuário
 */
export interface BaseRegisterDto {
  email: string;
  password: string;
  roleId?: string; // ID do papel (opcional, usa o padrão se não informado)
}

/**
 * DTO para requisição de registro de pessoa física
 */
export interface RegisterPessoaFisicaDto extends BaseRegisterDto {
  name: string;
  cpf: string;
  rg?: string;
  birthDate: string; // Data no formato 'YYYY-MM-DD'
  gender: string; // MASCULINO, FEMININO, OUTRO, NAO_INFORMADO
  phone: string;
  companyName?: string; // Empresa onde trabalha (opcional)
  maritalStatus?: string; // Estado civil

  // Endereço
  address?: {
    zipCode: string;
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    city: string;
    state: string;
    country?: string;
  };
}

/**
 * DTO para requisição de registro de pessoa jurídica
 */
export interface RegisterPessoaJuridicaDto extends BaseRegisterDto {
  companyName: string; // Nome da empresa
  tradeName: string; // Nome fantasia
  legalName: string; // Razão social
  cnpj: string;
  phone: string;
  website?: string;

  // Endereço
  address?: {
    zipCode: string;
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    city: string;
    state: string;
    country?: string;
  };
}

/**
 * DTO para resposta de registro de usuário
 */
export interface RegisterResponseDto {
  id: string;
  email: string;
  userType: string;
  document: string; // CPF ou CNPJ
  name: string; // Nome da pessoa ou empresa
  matricula: string;
  role: string;
  createdAt: Date;
}

/**
 * DTO para requisição de alteração de senha
 */
export interface ChangePasswordRequestDto {
  currentPassword: string;
  newPassword: string;
}

/**
 * DTO para resposta genérica de sucesso
 */
export interface SuccessResponseDto {
  success: boolean;
  message: string;
}
