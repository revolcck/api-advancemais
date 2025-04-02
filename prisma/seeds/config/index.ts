/**
 * Arquivo principal de configurações que reúne todas as configurações individuais
 */
import { adminConfig } from "./admin.config";
import { rolesConfig, ROLES } from "./roles.config";
import { subscriptionConfig } from "./subscription.config";
import { couponConfig } from "./coupon.config";
import { seedGroupsConfig } from "./seed-groups.config";

/**
 * Configuração centralizada para todo o sistema de seeds
 */
export const CONFIG = {
  admin: adminConfig,
  roles: rolesConfig,
  ROLES,
  subscriptionPlans: subscriptionConfig.plans,
  coupons: couponConfig,
  seedGroups: seedGroupsConfig,
};

export default CONFIG;

// Re-exportações para acesso direto
export * from "./admin.config";
export * from "./roles.config";
export * from "./subscription.config";
export * from "./coupon.config";
export * from "./seed-groups.config";
export * from "./types";
