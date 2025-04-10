/**
 * Middlewares para verificação de assinaturas
 * @module modules/subscription/middleware/subscription.middleware
 */

import { Request, Response, NextFunction } from "express";
import { prisma } from "@/config/database";
import { ApiResponse } from "@/shared/utils/api-response.utils";
import { logger } from "@/shared/utils/logger.utils";
import { SubscriptionStatus } from "@prisma/client";

// Extendendo a interface Request para incluir a assinatura
declare global {
  namespace Express {
    interface Request {
      subscription?: any;
      subscriptionPlan?: any;
    }
  }
}

/**
 * Middleware que verifica se o usuário tem uma assinatura ativa
 * @param req Requisição Express
 * @param res Resposta Express
 * @param next Função next do Express
 */
export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      ApiResponse.error(res, "Usuário não autenticado", {
        code: "UNAUTHORIZED",
        statusCode: 401,
      });
      return;
    }

    // Busca por uma assinatura ativa do usuário
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        isPaused: false,
      },
      include: {
        plan: true,
      },
    });

    if (!activeSubscription) {
      ApiResponse.error(
        res,
        "É necessária uma assinatura ativa para esta operação",
        {
          code: "SUBSCRIPTION_REQUIRED",
          statusCode: 403,
        }
      );
      return;
    }

    // Adiciona a assinatura e o plano ao objeto de requisição para uso posterior
    req.subscription = activeSubscription;
    req.subscriptionPlan = activeSubscription.plan;

    next();
  } catch (error) {
    logger.error("Erro ao verificar assinatura ativa:", error);
    ApiResponse.error(res, "Erro ao verificar assinatura", {
      code: "SUBSCRIPTION_VERIFICATION_ERROR",
      statusCode: 500,
    });
  }
};

/**
 * Middleware que verifica se o plano do usuário tem uma feature específica
 * @param featureName Nome da feature a ser verificada
 * @returns Middleware configurado para a feature
 */
export const requirePlanFeature = (featureName: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Se não tiver a assinatura na requisição, usa o middleware anterior
      if (!req.subscription) {
        await requireActiveSubscription(req, res, () => {});
        // Se ainda não tiver a assinatura, o middleware anterior já respondeu com erro
        if (!req.subscription) return;
      }

      const plan = req.subscriptionPlan;

      // Verifica se o plano tem a feature especificada
      if (!plan || !plan.features) {
        ApiResponse.error(res, "Detalhes do plano não disponíveis", {
          code: "PLAN_DETAILS_UNAVAILABLE",
          statusCode: 500,
        });
        return;
      }

      // Verifica se a feature existe e está habilitada no plano
      if (!plan.features[featureName]) {
        ApiResponse.error(res, `Seu plano não inclui: ${featureName}`, {
          code: "FEATURE_NOT_INCLUDED",
          statusCode: 403,
          meta: {
            requiredFeature: featureName,
            planName: plan.name,
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error(`Erro ao verificar feature '${featureName}':`, error);
      ApiResponse.error(res, "Erro ao verificar recursos do plano", {
        code: "FEATURE_VERIFICATION_ERROR",
        statusCode: 500,
      });
    }
  };
};

/**
 * Middleware que verifica o número máximo de vagas disponíveis para o usuário
 * @param req Requisição Express
 * @param res Resposta Express
 * @param next Função next do Express
 */
export const checkJobOfferLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Se não tiver a assinatura na requisição, usa o middleware anterior
    if (!req.subscription) {
      await requireActiveSubscription(req, res, () => {});
      // Se ainda não tiver a assinatura, o middleware anterior já respondeu com erro
      if (!req.subscription) return;
    }

    const subscription = req.subscription;
    const plan = req.subscriptionPlan;

    // Verifica se o plano especifica um limite de vagas
    if (
      !plan ||
      plan.maxJobOffers === null ||
      plan.maxJobOffers === undefined
    ) {
      ApiResponse.error(res, "Limite de vagas não configurado no plano", {
        code: "JOB_LIMIT_NOT_CONFIGURED",
        statusCode: 400,
      });
      return;
    }

    // Se o limite for 0, não permite criar vagas
    if (plan.maxJobOffers === 0) {
      ApiResponse.error(res, "Seu plano não permite publicar vagas", {
        code: "JOB_POSTING_NOT_ALLOWED",
        statusCode: 403,
      });
      return;
    }

    // Conta quantas vagas ativas o usuário já tem
    const activeJobOffersCount = await prisma.jobOffer.count({
      where: {
        companyId: req.user?.id,
        status: {
          in: ["PUBLISHED", "PENDING_APPROVAL"],
        },
      },
    });

    // Verifica se o usuário já atingiu o limite
    if (activeJobOffersCount >= plan.maxJobOffers) {
      ApiResponse.error(res, "Você atingiu o limite de vagas do seu plano", {
        code: "JOB_LIMIT_REACHED",
        statusCode: 403,
        meta: {
          currentCount: activeJobOffersCount,
          maxAllowed: plan.maxJobOffers,
          planName: plan.name,
        },
      });
      return;
    }

    next();
  } catch (error) {
    logger.error("Erro ao verificar limite de vagas:", error);
    ApiResponse.error(res, "Erro ao verificar limite de vagas", {
      code: "JOB_LIMIT_VERIFICATION_ERROR",
      statusCode: 500,
    });
  }
};
