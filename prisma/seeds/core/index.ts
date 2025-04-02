import { seedManager } from "../utils";
import { seedRoles } from "./roles";
import { seedUsers } from "./users";
import CONFIG from "../config";

/**
 * Registra os seeds do domínio core (estrutura básica do sistema)
 */
export function registerCoreSeeds(): void {
  // Registrar seed de Roles (sem dependências)
  seedManager.registerSeed("roles", seedRoles);

  // Registrar seed de Usuários (depende de roles)
  seedManager.registerSeed("users", seedUsers, ["roles"]);
}

// Re-exportação para acesso direto
export * from "./roles";
export * from "./users";
