/**
 * Constantes de permissões do sistema
 * @module shared/constants/permissions
 *
 * Define as permissões (roles) disponíveis no sistema e grupos comuns
 * de permissões para facilitar a autorização em diferentes rotas.
 */
import { Permission } from "../types/routes.types";

/**
 * Definição de todos os papéis/roles disponíveis no sistema
 * Deve ser mantido sincronizado com as roles disponíveis no banco de dados
 */
export const ROLES = {
  ADMIN: "Super Administrador",
  ADMINISTRATOR: "Administrador",
  FINANCIAL: "Financeiro",
  PROFESSOR: "Professor",
  STUDENT: "Aluno",
  COMPANY: "Empresa",
  PEDAGOGICAL: "Setor Pedagógico",
  RECRUITER: "Recrutadores",
  HR: "Recursos Humanos",
};

/**
 * Grupos de permissões para diferentes níveis de acesso ao sistema
 */
export const PERMISSIONS = {
  /**
   * Permissões para administradores do sistema
   */
  ADMIN: [ROLES.ADMIN, ROLES.ADMINISTRATOR] as Permission[],

  /**
   * Permissões para equipe financeira
   */
  FINANCIAL: [
    ROLES.ADMIN,
    ROLES.ADMINISTRATOR,
    ROLES.FINANCIAL,
  ] as Permission[],

  /**
   * Permissões para recrutadores
   */
  RECRUITER: [
    ROLES.ADMIN,
    ROLES.ADMINISTRATOR,
    ROLES.RECRUITER,
  ] as Permission[],

  /**
   * Permissões para recursos humanos
   */
  HR: [ROLES.ADMIN, ROLES.ADMINISTRATOR, ROLES.HR] as Permission[],

  /**
   * Permissões para equipe pedagógica
   */
  PEDAGOGICAL: [
    ROLES.ADMIN,
    ROLES.ADMINISTRATOR,
    ROLES.PEDAGOGICAL,
  ] as Permission[],
};
