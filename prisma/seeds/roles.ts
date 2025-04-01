import { Role } from "@prisma/client";
import { SeedContext, prisma, upsertEntities } from "./utils";

/**
 * Constantes para identificar roles especiais (evita hardcoding)
 */
export const ROLES = {
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
 * Seed para criar roles do sistema
 */
export async function seedRoles(context: SeedContext): Promise<SeedContext> {
  console.log("Criando roles do sistema...");

  const roles = [
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

  // Cria as roles usando o utilitário para reduzir código duplicado
  const createdRoles = await upsertEntities<Role, any>(
    "Role",
    roles,
    async (role) => {
      return prisma.role.upsert({
        where: { name: role.name },
        update: role,
        create: role,
      });
    }
  );

  // Armazena a role de admin para uso em outros seeds
  const adminRole = createdRoles.find((role) => role.name === ROLES.ADMIN);

  if (!adminRole) {
    throw new Error(`Role de ${ROLES.ADMIN} não foi criada corretamente!`);
  }

  return {
    ...context,
    adminRole,
    roles: createdRoles,
  };
}
