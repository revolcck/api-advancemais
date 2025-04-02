import { seedManager } from "../utils";
import { seedRoles } from "./roles";
import { seedUsers } from "./users";
import { seedAdminUser } from "./adminUser";
import { SeedContext } from "../utils/types";

/**
 * Registra os seeds do domínio core (estrutura básica do sistema)
 */
export function registerCoreSeeds(): void {
  // Registrar seed de Roles (sem dependências)
  seedManager.registerSeed("roles", seedRoles);

  // Registrar seed de Admin (depende de roles)
  seedManager.registerSeed("adminUser", seedAdminUser, ["roles"]);

  // Registrar seed de Usuários (depende de roles e adminUser)
  seedManager.registerSeed("users", seedUsers, ["roles", "adminUser"]);
}

/**
 * Função para executar todos os seeds core em sequência
 */
export async function seedCoreSystem(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Iniciando seed do sistema core...");

  try {
    // Executar seeds em ordem
    let currentContext = { ...context };

    // Executar roles primeiro
    currentContext = await seedManager.executeSeed("roles");

    // Depois o admin
    currentContext = await seedManager.executeSeed("adminUser");

    // Por fim os usuários de teste
    currentContext = await seedManager.executeSeed("users");

    console.log("Seed do sistema core finalizado!");
    return currentContext;
  } catch (error) {
    console.error("Erro durante seed do sistema core:", error);
    throw error;
  }
}

export * from "./roles";
export * from "./adminUser";
export * from "./users";
