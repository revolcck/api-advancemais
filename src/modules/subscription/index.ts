/**
 * Módulo de assinaturas do MercadoPago
 * Gerencia assinaturas, planos e recorrências via MercadoPago
 *
 * @module modules/subscription
 */

// Exportar rotas para uso no app principal
import routes from "./routes";

// Importações principais
import * as DTO from "./dto/subscription.dto";
import * as Services from "./services/subscription.service";
import * as Interfaces from "./interfaces/subscription.interface";
import * as Types from "./types/subscription.types";

// Re-exportar para uso externo
export { routes, DTO, Services, Interfaces, Types };

// Exportação padrão das rotas
export default routes;
