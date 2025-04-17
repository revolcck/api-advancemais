import { RoleConfig, RolesConstants } from "./types";

/**
 * Constantes para identificar roles especiais
 * Estas constantes facilitam a referência às roles em todo o código
 */
export const ROLES: RolesConstants = {
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
    name: ROLES.STUDENT,
    level: 2,
    status: 1,
    description: "Alunos do sistema",
  },
  {
    name: ROLES.COMPANY,
    level: 3,
    status: 1,
    description: "Empresas parceiras",
  },
  {
    name: ROLES.ADMINISTRATOR,
    level: 4,
    status: 1,
    description: "Administradores do sistema",
  },
  {
    name: ROLES.RECRUITER,
    level: 5,
    status: 1,
    description: "Profissionais de recrutamento",
  },
  {
    name: ROLES.PEDAGOGICAL,
    level: 6,
    status: 1,
    description: "Equipe pedagógica",
  },
  {
    name: ROLES.HR,
    level: 7,
    status: 1,
    description: "Equipe de RH",
  },
  {
    name: ROLES.FINANCIAL,
    level: 8,
    status: 1,
    description: "Equipe financeira",
  },
  {
    name: ROLES.ADMIN,
    level: 9,
    status: 1,
    description: "Acesso total ao sistema",
  },
];
