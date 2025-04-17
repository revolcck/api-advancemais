/**
 * Tipos e interfaces compartilhados para rotas
 * @module shared/types/routes
 *
 * Define tipos comuns que podem ser utilizados por todos os módulos
 * para padronizar a configuração de rotas.
 */

/**
 * Tipo de HTTP methods suportados
 */
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD";

/**
 * Tipos de acesso a rotas
 */
export type AccessType = "public" | "private" | "admin";

/**
 * Tipos de permissões suportados pelo sistema
 * Deve ser mantido sincronizado com as permissões do banco de dados
 */
export type Permission = string;

/**
 * Interface para configuração de rota
 */
export interface RouteConfig {
  /**
   * Caminho da rota
   */
  path: string;

  /**
   * Método HTTP da rota
   */
  method: HttpMethod;

  /**
   * Descrição da rota para documentação
   */
  description: string;

  /**
   * Tipo de acesso (público ou privado)
   */
  access: AccessType;

  /**
   * Permissões necessárias (quando aplicável)
   */
  permissions?: Permission[];

  /**
   * Controller e método que implementa a rota
   */
  handler?: string;

  /**
   * Validadores aplicados à rota
   */
  validators?: string[];

  /**
   * Tags para documentação/Swagger
   */
  tags?: string[];
}

/**
 * Interface para um módulo de rotas
 */
export interface RouteModule {
  /**
   * Nome do módulo
   */
  name: string;

  /**
   * Caminho base do módulo
   */
  basePath: string;

  /**
   * Rotas definidas no módulo
   */
  routes: RouteConfig[];
}
