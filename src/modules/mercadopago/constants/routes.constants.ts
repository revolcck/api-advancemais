/**
 * Constantes de rotas do MercadoPago
 * @module modules/mercadopago/constants/routes
 *
 * Define os caminhos e agrupamentos das rotas relacionadas ao MercadoPago.
 */

/**
 * Caminhos principais do módulo MercadoPago
 */
export const MERCADOPAGO_ROUTES = {
  /**
   * Rotas de status e verificação
   */
  STATUS: "/status",

  /**
   * Rotas de webhooks e notificações
   */
  WEBHOOKS: "/webhooks",

  /**
   * Rotas para pagamentos de cursos
   */
  COURSES: "/courses",

  /**
   * Rotas para assinaturas
   */
  SUBSCRIBER: "/subscriber",

  /**
   * Rota de verificação de saúde
   */
  HEALTH: "/health",
};

/**
 * Rotas para verificação de status
 */
export const STATUS_ROUTES = {
  /**
   * Rota raiz para verificação de status
   */
  ROOT: "/",

  /**
   * Rota para obter a chave pública do MercadoPago
   */
  PUBLIC_KEY: "/public-key",

  /**
   * Rota para obter configurações do MercadoPago
   */
  CONFIG: "/config",
};

/**
 * Rotas para pagamentos de cursos
 */
export const COURSE_ROUTES = {
  /**
   * Rota para criar um pagamento
   */
  PAYMENT: "/payment",

  /**
   * Rota para verificar o status de um pagamento
   */
  PAYMENT_STATUS: "/payment/:checkoutId",

  /**
   * Rota para verificar acesso a um curso
   */
  ACCESS: "/access/:courseId",

  /**
   * Rota para obter configurações de pagamento
   */
  PAYMENT_CONFIG: "/payment-config",

  /**
   * Rota para administração de pagamentos
   */
  ADMIN_PAYMENTS: "/admin/payments",
};

/**
 * Rotas para assinaturas
 */
export const SUBSCRIBER_ROUTES = {
  /**
   * Rota raiz para assinaturas
   */
  ROOT: "/",

  /**
   * Rota para uma assinatura específica
   */
  SUBSCRIPTION: "/:id",

  /**
   * Rota para cancelar uma assinatura
   */
  CANCEL: "/:id/cancel",

  /**
   * Rota para verificar assinatura ativa
   */
  CHECK: "/check",

  /**
   * Rota para administração de assinaturas
   */
  ADMIN_LIST: "/admin/list",

  /**
   * Rota para atualização administrativa de assinatura
   */
  ADMIN_UPDATE: "/admin/:id/update",
};

/**
 * Rotas para webhooks
 */
export const WEBHOOK_ROUTES = {
  /**
   * Rota raiz para webhooks
   */
  ROOT: "/",

  /**
   * Rota para webhooks de checkout
   */
  CHECKOUT: "/checkout",

  /**
   * Rota para webhooks de assinatura
   */
  SUBSCRIPTION: "/subscription",

  /**
   * Rota para histórico de webhooks
   */
  HISTORY: "/history",

  /**
   * Rota para teste de webhooks
   */
  TEST: "/test",
};
