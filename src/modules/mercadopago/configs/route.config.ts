/**
 * Configuração de rotas do MercadoPago
 * @module modules/mercadopago/configs/route
 *
 * Define a configuração e documentação das rotas do módulo MercadoPago
 * utilizando as estruturas compartilhadas.
 */
import { RouteModule } from "@/shared/types/routes.types";
import { RouteConfigBuilder } from "@/shared/builders/RouteConfigBuilder";
import { PERMISSIONS } from "@/shared/constants/permissions.constants";
import { RouteService } from "@/shared/services/route.service";
import {
  MERCADOPAGO_ROUTES,
  STATUS_ROUTES,
  COURSE_ROUTES,
  SUBSCRIBER_ROUTES,
  WEBHOOK_ROUTES,
} from "../constants/routes.constants";

/**
 * Configuração do módulo de rotas do MercadoPago
 */
const mercadoPagoModule: RouteModule = {
  name: "MercadoPago",
  basePath: "/api/mercadopago",
  routes: [
    // Rota de saúde
    RouteConfigBuilder.create()
      .path(MERCADOPAGO_ROUTES.HEALTH)
      .get()
      .description("Verificação de saúde do serviço MercadoPago")
      .public()
      .handler("MercadoPagoController.checkHealth")
      .tags(["MercadoPago", "Health"])
      .build(),

    // Rotas de Status
    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.STATUS}${STATUS_ROUTES.ROOT}`)
      .get()
      .description("Verifica o status de conectividade com MercadoPago")
      .admin()
      .permissions(PERMISSIONS.ADMIN)
      .handler("StatusController.checkStatus")
      .tags(["MercadoPago", "Status"])
      .build(),

    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.STATUS}${STATUS_ROUTES.PUBLIC_KEY}`)
      .get()
      .description("Obtém a chave pública do MercadoPago")
      .public()
      .handler("StatusController.getPublicKey")
      .tags(["MercadoPago", "Status"])
      .build(),

    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.STATUS}${STATUS_ROUTES.CONFIG}`)
      .get()
      .description("Obtém configurações do MercadoPago")
      .admin()
      .permissions(PERMISSIONS.ADMIN)
      .handler("StatusController.getConfig")
      .tags(["MercadoPago", "Status"])
      .build(),

    // Rotas de Pagamento de Cursos
    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.COURSES}${COURSE_ROUTES.PAYMENT}`)
      .post()
      .description("Cria uma preferência de pagamento para um curso")
      .private()
      .handler("CoursePaymentController.createCoursePayment")
      .validators(["createCoursePaymentSchema"])
      .tags(["MercadoPago", "Courses"])
      .build(),

    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.COURSES}${COURSE_ROUTES.PAYMENT_STATUS}`)
      .get()
      .description("Verifica o status de um pagamento de curso")
      .private()
      .handler("CoursePaymentController.checkPaymentStatus")
      .tags(["MercadoPago", "Courses"])
      .build(),

    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.COURSES}${COURSE_ROUTES.ACCESS}`)
      .get()
      .description("Verifica se um usuário tem acesso a um curso")
      .private()
      .handler("CoursePaymentController.checkCourseAccess")
      .tags(["MercadoPago", "Courses"])
      .build(),

    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.COURSES}${COURSE_ROUTES.PAYMENT_CONFIG}`)
      .get()
      .description("Obtém configurações de pagamento para o frontend")
      .private()
      .handler("CoursePaymentController.getPaymentConfig")
      .tags(["MercadoPago", "Courses"])
      .build(),

    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.COURSES}${COURSE_ROUTES.ADMIN_PAYMENTS}`)
      .get()
      .description("Lista todos os pagamentos de cursos realizados")
      .admin()
      .permissions(PERMISSIONS.FINANCIAL)
      .handler("CoursePaymentController.getPaymentConfig")
      .tags(["MercadoPago", "Courses", "Admin"])
      .build(),

    // Rotas de Assinatura
    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.SUBSCRIBER}${SUBSCRIBER_ROUTES.ROOT}`)
      .post()
      .description("Cria uma nova assinatura")
      .private()
      .handler("SubscriptionController.createSubscription")
      .validators(["createSubscriptionSchema"])
      .tags(["MercadoPago", "Subscription"])
      .build(),

    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.SUBSCRIBER}${SUBSCRIBER_ROUTES.SUBSCRIPTION}`)
      .get()
      .description("Obtém detalhes de uma assinatura específica")
      .private()
      .handler("SubscriptionController.getSubscription")
      .tags(["MercadoPago", "Subscription"])
      .build(),

    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.SUBSCRIBER}${SUBSCRIBER_ROUTES.ROOT}`)
      .get()
      .description("Lista as assinaturas do usuário autenticado")
      .private()
      .handler("SubscriptionController.listSubscriptions")
      .tags(["MercadoPago", "Subscription"])
      .build(),

    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.SUBSCRIBER}${SUBSCRIBER_ROUTES.CANCEL}`)
      .post()
      .description("Cancela uma assinatura")
      .private()
      .handler("SubscriptionController.cancelSubscription")
      .validators(["cancelSubscriptionSchema"])
      .tags(["MercadoPago", "Subscription"])
      .build(),

    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.SUBSCRIBER}${SUBSCRIBER_ROUTES.CHECK}`)
      .get()
      .description("Verifica se o usuário tem assinatura ativa")
      .private()
      .handler("SubscriptionController.checkActiveSubscription")
      .tags(["MercadoPago", "Subscription"])
      .build(),

    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.SUBSCRIBER}${SUBSCRIBER_ROUTES.ADMIN_LIST}`)
      .get()
      .description("Lista todas as assinaturas (para administração)")
      .admin()
      .permissions(PERMISSIONS.FINANCIAL)
      .handler("SubscriptionController.listSubscriptions")
      .tags(["MercadoPago", "Subscription", "Admin"])
      .build(),

    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.SUBSCRIBER}${SUBSCRIBER_ROUTES.ADMIN_UPDATE}`)
      .post()
      .description("Atualiza uma assinatura (para administração)")
      .admin()
      .permissions(PERMISSIONS.FINANCIAL)
      .handler("SubscriptionController.updateSubscription")
      .tags(["MercadoPago", "Subscription", "Admin"])
      .build(),

    // Rotas de Webhook
    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.WEBHOOKS}${WEBHOOK_ROUTES.ROOT}`)
      .post()
      .description(
        "Endpoint principal para receber notificações do MercadoPago"
      )
      .public()
      .handler("WebhookController.handleWebhook")
      .tags(["MercadoPago", "Webhook"])
      .build(),

    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.WEBHOOKS}${WEBHOOK_ROUTES.CHECKOUT}`)
      .post()
      .description("Endpoint específico para webhooks do Checkout Pro")
      .public()
      .handler("WebhookController.handleWebhook")
      .tags(["MercadoPago", "Webhook"])
      .build(),

    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.WEBHOOKS}${WEBHOOK_ROUTES.SUBSCRIPTION}`)
      .post()
      .description("Endpoint específico para webhooks de Assinaturas")
      .public()
      .handler("WebhookController.handleWebhook")
      .tags(["MercadoPago", "Webhook"])
      .build(),

    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.WEBHOOKS}${WEBHOOK_ROUTES.HISTORY}`)
      .get()
      .description("Consulta o histórico de webhooks recebidos")
      .admin()
      .permissions(PERMISSIONS.FINANCIAL)
      .handler("WebhookController.getWebhookHistory")
      .tags(["MercadoPago", "Webhook", "Admin"])
      .build(),

    RouteConfigBuilder.create()
      .path(`${MERCADOPAGO_ROUTES.WEBHOOKS}${WEBHOOK_ROUTES.TEST}`)
      .get()
      .description(
        "Endpoint para teste de webhook (apenas ambiente de desenvolvimento)"
      )
      .admin()
      .permissions(PERMISSIONS.ADMIN)
      .handler("WebhookController.testWebhook")
      .tags(["MercadoPago", "Webhook", "Admin"])
      .build(),
  ],
};

// Registra o módulo no serviço de rotas
RouteService.registerModule(mercadoPagoModule);

// Exporta a configuração
export default mercadoPagoModule;
