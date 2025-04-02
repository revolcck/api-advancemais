import { RoleConfig, RolesConstants } from "./types";

/**
 * Constantes para identificar roles especiais
 * Estas constantes facilitam a referência às roles em todo o código
 */
export const ROLES: RolesConstants = {
  ADMIN: "Super Administrador",
  PROFESSOR: "Professor",
  ALUNO: "Aluno",
  EMPRESA: "Empresa",
  SETOR_PEDAGOGICO: "Setor Pedagógico",
  RECRUTADORES: "Recrutadores",
  RH: "Recursos Humanos",
  ADMINISTRADOR: "Administrador",
};

/**
 * Configurações dos papéis/funções do sistema
 */
export const rolesConfig: RoleConfig[] = [
  {
    name: ROLES.PROFESSOR,
    level: 1,
    status: 1,
    description: "Professores e instrutores",
  },
  {
    name: ROLES.ALUNO,
    level: 2,
    status: 1,
    description: "Alunos do sistema",
  },
  {
    name: ROLES.EMPRESA,
    level: 3,
    status: 1,
    description: "Empresas parceiras",
  },
  {
    name: ROLES.ADMINISTRADOR,
    level: 4,
    status: 1,
    description: "Administradores do sistema",
  },
  {
    name: ROLES.RECRUTADORES,
    level: 5,
    status: 1,
    description: "Profissionais de recrutamento",
  },
  {
    name: ROLES.SETOR_PEDAGOGICO,
    level: 6,
    status: 1,
    description: "Equipe pedagógica",
  },
  {
    name: ROLES.RH,
    level: 7,
    status: 1,
    description: "Equipe de RH",
  },
  {
    name: ROLES.ADMIN,
    level: 8,
    status: 1,
    description: "Acesso total ao sistema",
  },
];
