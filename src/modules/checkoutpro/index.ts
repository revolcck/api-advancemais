/**
 * Módulo de Checkout Pro do MercadoPago
 * Gerencia pagamentos únicos e preferências via MercadoPago Checkout Pro
 *
 * @module modules/checkoutpro
 */

// Exportar rotas para uso no app principal
import routes from "./routes";

// Importações principais
import * as PaymentDTO from "./dto/payment.dto";
import * as PreferenceDTO from "./dto/preference.dto";
import * as Services from "./services/preference.service";
import * as Interfaces from "./interfaces/preference.interface";
import * as Types from "./types/payment.types";

// Re-exportar para uso externo
export { routes, PaymentDTO, PreferenceDTO, Services, Interfaces, Types };

// Exportação padrão das rotas
export default routes;
