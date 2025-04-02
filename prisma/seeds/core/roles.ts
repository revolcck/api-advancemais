import { Role } from "@prisma/client";
import { SeedContext, prisma, upsertEntities, logger } from "../utils";
import CONFIG from "../config";

/**
 * Seeds de papéis/funções do sistema
 *
 * @param context Contexto de seed
 * @returns Contexto atualizado com roles
 */
export async function seedRoles(context: SeedContext): Promise<SeedContext> {
  logger.info("Criando roles do sistema...");

  // Usar dados da configuração para criar roles
  const roles = CONFIG.roles;

  // Criar as roles usando o utilitário para reduzir código duplicado
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
    { logDetails: true }
  );

  // Armazena a role de admin para uso em outros seeds
  const adminRole = createdRoles.find(
    (role) => role.name === CONFIG.ROLES.ADMIN
  );

  if (!adminRole) {
    throw new Error(
      `Role de ${CONFIG.ROLES.ADMIN} não foi criada corretamente!`
    );
  }

  logger.success(`Criadas ${createdRoles.length} roles no sistema`);

  return {
    ...context,
    adminRole,
    roles: createdRoles,
  };
}
