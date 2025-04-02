import { Role } from "@prisma/client";
import { SeedContext, prisma, logger, upsertEntities } from "../utils";
import { ROLES, rolesConfig } from "../config/roles.config";

/**
 * Seeds de papéis/funções do sistema
 *
 * @param context Contexto de seed
 * @returns Contexto atualizado com roles
 */
export async function seedRoles(context: SeedContext): Promise<SeedContext> {
  logger.section("Criando funções (roles) do sistema");

  // Usar dados da configuração para criar roles
  const roles = rolesConfig;

  // Criar as roles usando o utilitário para reduzir código duplicado
  // Passando true para o parâmetro continueOnError
  const createdRoles = await upsertEntities<Role, any>(
    "Role",
    roles,
    async (role) => {
      return prisma.role.upsert({
        where: { name: role.name },
        update: role,
        create: role,
      });
    },
    true // continueOnError = true
  );

  // Armazena a role de admin para uso em outros seeds
  const adminRole = createdRoles.find((role) => role.name === ROLES.ADMIN);

  if (!adminRole) {
    throw new Error(`Role de ${ROLES.ADMIN} não foi criada corretamente!`);
  }

  logger.success(`Criadas ${createdRoles.length} roles no sistema`);

  return {
    ...context,
    adminRole,
    roles: createdRoles,
  };
}
