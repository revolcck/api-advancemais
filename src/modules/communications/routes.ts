// src/modules/communications/routes.ts - Adicionando novas rotas

import { Router } from "express";
import { CommunicationsController } from "./controllers/communications.controller";
import { EmailTestController } from "./controllers/email-test.controller";
import { validate } from "@/shared/middleware/validate.middleware";
import {
  sendEmailSchema,
  sendTemplateEmailSchema,
  sendSmsSchema,
  sendTemplateSmsSchema,
  sendWhatsAppSchema,
  sendWhatsAppTemplateSchema,
} from "./validators/communications.validators";
import { authenticate, authorize } from "@/shared/middleware/auth.middleware";

/**
 * Inicializa o router para as rotas de comunicações
 */
const router: Router = Router();

/**
 * Inicializa os controladores
 */
const communicationsController = new CommunicationsController();
const emailTestController = new EmailTestController();

/**
 * @route GET /api/communications/test-connectivity
 * @desc Testa a conectividade com a API da Brevo
 * @access Privado (admin)
 */
router.get(
  "/test-connectivity",
  authenticate,
  authorize(["ADMIN", "Super Administrador"]),
  communicationsController.testConnectivity
);

/**
 * @route GET /api/communications/email-status
 * @desc Verifica o status da configuração de email
 * @access Privado (admin)
 */
router.get(
  "/email-status",
  authenticate,
  authorize(["ADMIN", "Super Administrador"]),
  emailTestController.checkEmailStatus
);

/**
 * @route POST /api/communications/test-email
 * @desc Envia um email de teste
 * @access Privado (admin)
 */
router.post(
  "/test-email",
  authenticate,
  authorize(["ADMIN", "Super Administrador"]),
  emailTestController.testEmail
);

/**
 * @route POST /api/communications/email
 * @desc Envia um email
 * @access Privado
 */
router.post(
  "/email",
  authenticate,
  validate(sendEmailSchema),
  communicationsController.sendEmail
);

/**
 * @route POST /api/communications/email/template
 * @desc Envia um email usando um template
 * @access Privado
 */
router.post(
  "/email/template",
  authenticate,
  validate(sendTemplateEmailSchema),
  communicationsController.sendTemplateEmail
);

/**
 * @route POST /api/communications/sms
 * @desc Envia um SMS
 * @access Privado
 */
router.post(
  "/sms",
  authenticate,
  validate(sendSmsSchema),
  communicationsController.sendSms
);

/**
 * @route POST /api/communications/sms/template
 * @desc Envia um SMS usando um template
 * @access Privado
 */
router.post(
  "/sms/template",
  authenticate,
  validate(sendTemplateSmsSchema),
  communicationsController.sendTemplateSms
);

/**
 * @route POST /api/communications/whatsapp
 * @desc Envia uma mensagem WhatsApp
 * @access Privado
 */
router.post(
  "/whatsapp",
  authenticate,
  validate(sendWhatsAppSchema),
  communicationsController.sendWhatsApp
);

/**
 * @route POST /api/communications/whatsapp/template
 * @desc Envia uma mensagem WhatsApp usando um template
 * @access Privado
 */
router.post(
  "/whatsapp/template",
  authenticate,
  validate(sendWhatsAppTemplateSchema),
  communicationsController.sendWhatsAppTemplate
);

/**
 * @route GET /api/communications/whatsapp/templates
 * @desc Obtém a lista de templates WhatsApp disponíveis
 * @access Privado (admin)
 */
router.get(
  "/whatsapp/templates",
  authenticate,
  authorize(["ADMIN", "Super Administrador"]),
  communicationsController.getWhatsAppTemplates
);

/**
 * Exporta o router de comunicações
 */
export default router;
