/**
 * Enumeração para os diferentes tipos de integração suportados pelo MercadoPago
 * @module modules/mercadopago/enums/integration-type.enum
 */

/**
 * Tipos de integração com o MercadoPago
 */
export enum MercadoPagoIntegrationType {
  /** Integração para assinaturas (recorrências) */
  SUBSCRIPTION = "subscription",

  /** Integração para checkout pro (pagamentos únicos) */
  CHECKOUT = "checkout",
}
