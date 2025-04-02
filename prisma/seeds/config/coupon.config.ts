import { BillingInterval, UserType } from "@prisma/client";
import { CouponConfig } from "./types";

/**
 * Configurações dos cupons de desconto
 */
export const couponConfig: Record<string, CouponConfig> = {
  // Cupom de boas-vindas
  welcome: {
    code: "WELCOME10",
    name: "Boas-vindas 10%",
    description: "Cupom de boas-vindas com 10% de desconto em qualquer plano",
    discountType: "PERCENTAGE",
    discountValue: 10.0,
    validityDays: 365, // 1 ano
    usageLimit: 1000,
    perUserLimit: 1,
    requiresUserAccount: true,
    onlyFirstPurchase: true,
    appliesToAllPlans: true,
    customMessage:
      "Parabéns! Você ganhou 10% de desconto na sua primeira assinatura.",
  },

  // Cupom de valor fixo
  fixedDiscount: {
    code: "50OFF",
    name: "R$50 de desconto",
    description: "Desconto fixo de R$50 em qualquer plano",
    discountType: "FIXED_AMOUNT",
    discountValue: 50.0,
    minPurchaseAmount: 100.0,
    validityDays: 90, // 3 meses
    usageLimit: 500,
    perUserLimit: 1,
    requiresUserAccount: true,
    customMessage: "Você economizou R$50 na sua assinatura!",
    appliesToAllPlans: true,
  },

  // Cupom para Black Friday
  blackFriday: {
    code: "BLACKFRIDAY30",
    name: "Black Friday 30%",
    description: "Desconto especial de Black Friday: 30% em todos os planos",
    discountType: "PERCENTAGE",
    discountValue: 30.0,
    maxDiscountAmount: 150.0,
    validityDays: 10, // 10 dias
    usageLimit: 2000,
    perUserLimit: 1,
    requiresUserAccount: true,
    customMessage: "Você aproveitou o desconto exclusivo de Black Friday!",
    appliesToAllPlans: true,
  },

  // Cupom para empresas
  enterprise: {
    code: "EMPRESA20",
    name: "Empresas 20%",
    description:
      "Desconto exclusivo para pessoas jurídicas: 20% em planos avançados",
    discountType: "PERCENTAGE",
    discountValue: 20.0,
    validityDays: 180, // 6 meses
    usageLimit: 300,
    perUserLimit: 1,
    requiresUserAccount: true,
    userTypeLimitation: UserType.PESSOA_JURIDICA,
    customMessage: "Desconto exclusivo para sua empresa!",
    appliesToAllPlans: false,
    restrictedToPlans: ["Avançado", "Destaque"],
  },

  // Cupom para assinaturas anuais
  annual: {
    code: "ANNUAL25",
    name: "Anual 25%",
    description: "25% de desconto para assinaturas anuais",
    discountType: "PERCENTAGE",
    discountValue: 25.0,
    validityDays: 365, // 1 ano
    usageLimit: 500,
    perUserLimit: 2,
    requiresUserAccount: true,
    customMessage: "Você economizou 25% optando pelo plano anual!",
    appliesToAllPlans: true,
    billingIntervals: [BillingInterval.ANNUAL],
  },
};
