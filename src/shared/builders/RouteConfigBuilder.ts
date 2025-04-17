/**
 * Builder para configuração de rotas
 * @module shared/builders/RouteConfigBuilder
 *
 * Implementa o padrão Builder para criar configurações de rota
 * de forma fluente e com validações.
 */
import {
  RouteConfig,
  HttpMethod,
  AccessType,
  Permission,
} from "../types/routes.types";

/**
 * Builder para configuração de rotas
 * Facilita a criação de objetos RouteConfig com um API fluente
 */
export class RouteConfigBuilder {
  private config: Partial<RouteConfig> = {};

  /**
   * Define o caminho da rota
   *
   * @param path Caminho da rota
   * @returns A própria instância para encadeamento
   */
  public path(path: string): RouteConfigBuilder {
    this.config.path = path;
    return this;
  }

  /**
   * Define o método HTTP
   *
   * @param method Método HTTP
   * @returns A própria instância para encadeamento
   */
  public method(method: HttpMethod): RouteConfigBuilder {
    this.config.method = method;
    return this;
  }

  /**
   * Atalho para definir método GET
   *
   * @returns A própria instância para encadeamento
   */
  public get(): RouteConfigBuilder {
    return this.method("GET");
  }

  /**
   * Atalho para definir método POST
   *
   * @returns A própria instância para encadeamento
   */
  public post(): RouteConfigBuilder {
    return this.method("POST");
  }

  /**
   * Atalho para definir método PUT
   *
   * @returns A própria instância para encadeamento
   */
  public put(): RouteConfigBuilder {
    return this.method("PUT");
  }

  /**
   * Atalho para definir método DELETE
   *
   * @returns A própria instância para encadeamento
   */
  public delete(): RouteConfigBuilder {
    return this.method("DELETE");
  }

  /**
   * Atalho para definir método PATCH
   *
   * @returns A própria instância para encadeamento
   */
  public patch(): RouteConfigBuilder {
    return this.method("PATCH");
  }

  /**
   * Define a descrição da rota
   *
   * @param description Descrição da rota
   * @returns A própria instância para encadeamento
   */
  public description(description: string): RouteConfigBuilder {
    this.config.description = description;
    return this;
  }

  /**
   * Define o tipo de acesso
   *
   * @param access Tipo de acesso
   * @returns A própria instância para encadeamento
   */
  public access(access: AccessType): RouteConfigBuilder {
    this.config.access = access;
    return this;
  }

  /**
   * Atalho para definir acesso público
   *
   * @returns A própria instância para encadeamento
   */
  public public(): RouteConfigBuilder {
    return this.access("public");
  }

  /**
   * Atalho para definir acesso privado
   *
   * @returns A própria instância para encadeamento
   */
  public private(): RouteConfigBuilder {
    return this.access("private");
  }

  /**
   * Atalho para definir acesso administrativo
   *
   * @returns A própria instância para encadeamento
   */
  public admin(): RouteConfigBuilder {
    return this.access("admin");
  }

  /**
   * Define as permissões necessárias
   *
   * @param permissions Array de permissões
   * @returns A própria instância para encadeamento
   */
  public permissions(permissions: Permission[]): RouteConfigBuilder {
    this.config.permissions = permissions;
    return this;
  }

  /**
   * Define o handler da rota
   *
   * @param handler Nome do controller e método
   * @returns A própria instância para encadeamento
   */
  public handler(handler: string): RouteConfigBuilder {
    this.config.handler = handler;
    return this;
  }

  /**
   * Define os validadores da rota
   *
   * @param validators Array de nomes de validadores
   * @returns A própria instância para encadeamento
   */
  public validators(validators: string[]): RouteConfigBuilder {
    this.config.validators = validators;
    return this;
  }

  /**
   * Define as tags da rota para documentação
   *
   * @param tags Array de tags
   * @returns A própria instância para encadeamento
   */
  public tags(tags: string[]): RouteConfigBuilder {
    this.config.tags = tags;
    return this;
  }

  /**
   * Constrói e retorna o objeto RouteConfig
   *
   * @returns Objeto RouteConfig configurado
   * @throws Error se faltar algum campo obrigatório
   */
  public build(): RouteConfig {
    // Verifica campos obrigatórios
    if (!this.config.path) {
      throw new Error("Path é obrigatório para configuração de rota");
    }

    if (!this.config.method) {
      throw new Error("Method é obrigatório para configuração de rota");
    }

    if (!this.config.description) {
      throw new Error("Description é obrigatório para configuração de rota");
    }

    if (!this.config.access) {
      throw new Error("Access é obrigatório para configuração de rota");
    }

    // Retorna objeto completo
    return this.config as RouteConfig;
  }

  /**
   * Método estático para iniciar uma nova construção
   *
   * @returns Nova instância do builder
   */
  public static create(): RouteConfigBuilder {
    return new RouteConfigBuilder();
  }
}
