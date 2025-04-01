import { Role } from "@prisma/client";
import { SeedContext, prisma } from "./utils";

/**
 * Seed para criar roles do sistema
 */
export async function seedRoles(context: SeedContext): Promise<SeedContext> {
  console.log("Criando roles do sistema...");

  const roles = [
    {
      name: "Professor",
      level: 1,
      status: 1,
      description: "Professores e instrutores",
    },
    { name: "Aluno", level: 2, status: 1, description: "Alunos do sistema" },
    { name: "Empresa", level: 3, status: 1, description: "Empresas parceiras" },
    {
      name: "Administrador",
      level: 4,
      status: 1,
      description: "Administradores do sistema",
    },
    {
      name: "Recrutadores",
      level: 5,
      status: 1,
      description: "Profissionais de recrutamento",
    },
    {
      name: "Setor Pedagógico",
      level: 6,
      status: 1,
      description: "Equipe pedagógica",
    },
    {
      name: "Recursos Humanos",
      level: 7,
      status: 1,
      description: "Equipe de RH",
    },
    {
      name: "Super Administrador",
      level: 8,
      status: 1,
      description: "Acesso total ao sistema",
    },
  ];

  const createdRoles: Role[] = [];

  for (const role of roles) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: role,
      create: role,
    });
    console.log(`Role criada: ${createdRole.name}`);
    createdRoles.push(createdRole);
  }

  // Armazena a role de admin para uso em outros seeds
  const adminRole = createdRoles.find(
    (role) => role.name === "Super Administrador"
  );

  if (!adminRole) {
    throw new Error("Role de Super Administrador não foi criada corretamente!");
  }

  return {
    ...context,
    adminRole,
    roles: createdRoles,
  };
}
