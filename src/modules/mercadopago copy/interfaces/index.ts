/**
 * Exportação de interfaces para o módulo MercadoPago
 * @module modules/mercadopago/interfaces
 */

export * from "./adapters.interface";
export * from "./common.interface";
export * from "./config.interface";
export * from "./services.interface";

// Re-exportar tipos comuns das interfaces
export * from "../types/common.types";
export * from "../types/payment.types";
export * from "../types/events.types";
