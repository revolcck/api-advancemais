/**
 * Constantes para rotas do módulo de autenticação
 * @module modules/auth/constants
 */

/**
 * Rotas principais do módulo de autenticação
 */
export const AUTH_ROUTES = {
  /**
   * Rota base para autenticação
   */
  ROOT: "/",

  /**
   * Rota para login de usuário
   */
  LOGIN: "/login",

  /**
   * Rota para registro de pessoa física
   */
  REGISTER_PF: "/register/pessoa-fisica",

  /**
   * Rota para registro de pessoa jurídica
   */
  REGISTER_PJ: "/register/pessoa-juridica",

  /**
   * Rota para atualizar o token de acesso
   */
  REFRESH: "/refresh",

  /**
   * Rota para logout
   */
  LOGOUT: "/logout",

  /**
   * Rota para alterar senha
   */
  CHANGE_PASSWORD: "/change-password",

  /**
   * Rota para verificar status da autenticação
   */
  STATUS: "/status",

  /**
   * Rota para recuperação de senha
   */
  RECOVER_PASSWORD: "/recover-password",

  /**
   * Rota para redefinição de senha
   */
  RESET_PASSWORD: "/reset-password",
};

/**
 * Rotas para o módulo de usuários
 */
export const USER_ROUTES = {
  /**
   * Rota base para usuários
   */
  ROOT: "/",

  /**
   * Rota para perfil do usuário atual
   */
  ME: "/me",

  /**
   * Rota para atualizar perfil
   */
  UPDATE: "/update",

  /**
   * Rota para gerenciar usuários (admin)
   */
  ADMIN: "/admin",
};
