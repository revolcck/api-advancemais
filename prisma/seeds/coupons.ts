import {
  BillingInterval,
  Coupon,
  CouponStatus,
  DiscountType,
  UserType,
} from "@prisma/client";
import { SeedContext, prisma } from "./utils";

/**
 * Seed para criar cupons de desconto
 */
export async function seedCoupons(context: SeedContext): Promise<SeedContext> {
  console.log("Criando cupons de desconto...");

  if (!context.adminUser) {
    throw new Error(
      "Usuário administrador não encontrado no contexto. Execute o seed de usuários primeiro."
    );
  }

  // Data atual para calcular datas relativas
  const now = new Date();

  // Criar datas para Black Friday (último fim de semana de novembro)
  const currentYear = now.getFullYear();
  const blackFridayStart = new Date(currentYear, 10, 20); // 20 de novembro
  const blackFridayEnd = new Date(currentYear, 10, 30); // 30 de novembro

  // Array de cupons
  const coupons = [
    {
      code: "WELCOME10",
      name: "Boas-vindas 10%",
      description: "Cupom de boas-vindas com 10% de desconto em qualquer plano",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10.0, // 10%
      startDate: now,
      endDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), // Válido por 1 ano
      usageLimit: 1000,
      perUserLimit: 1,
      status: CouponStatus.ACTIVE,
      requiresUserAccount: true,
      onlyFirstPurchase: true,
      customMessage:
        "Parabéns! Você ganhou 10% de desconto na sua primeira assinatura.",
      appliesToAllPlans: true,
      createdById: context.adminUser.id,
    },
    {
      code: "50OFF",
      name: "R$50 de desconto",
      description: "Desconto fixo de R$50 em qualquer plano",
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 50.0, // R$50,00
      minPurchaseAmount: 100.0, // Válido apenas para compras acima de R$100
      startDate: now,
      endDate: new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()), // Válido por 3 meses
      usageLimit: 500,
      perUserLimit: 1,
      status: CouponStatus.ACTIVE,
      requiresUserAccount: true,
      customMessage: "Você economizou R$50 na sua assinatura!",
      appliesToAllPlans: true,
      createdById: context.adminUser.id,
    },
    {
      code: "BLACKFRIDAY30",
      name: "Black Friday 30%",
      description: "Desconto especial de Black Friday: 30% em todos os planos",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 30.0, // 30%
      maxDiscountAmount: 150.0, // Desconto máximo de R$150
      startDate: blackFridayStart,
      endDate: blackFridayEnd,
      usageLimit: 2000,
      perUserLimit: 1,
      status: CouponStatus.ACTIVE,
      requiresUserAccount: true,
      customMessage: "Você aproveitou o desconto exclusivo de Black Friday!",
      appliesToAllPlans: true,
      createdById: context.adminUser.id,
    },
    {
      code: "EMPRESA20",
      name: "Empresas 20%",
      description:
        "Desconto exclusivo para pessoas jurídicas: 20% em planos avançados",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20.0, // 20%
      startDate: now,
      endDate: new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()), // Válido por 6 meses
      usageLimit: 300,
      perUserLimit: 1,
      status: CouponStatus.ACTIVE,
      requiresUserAccount: true,
      userTypeLimitation: UserType.PESSOA_JURIDICA,
      customMessage: "Desconto exclusivo para sua empresa!",
      appliesToAllPlans: false, // Não se aplica a todos os planos
      createdById: context.adminUser.id,
    },
    {
      code: "ANNUAL25",
      name: "Anual 25%",
      description: "25% de desconto para assinaturas anuais",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 25.0, // 25%
      startDate: now,
      endDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), // Válido por 1 ano
      usageLimit: 500,
      perUserLimit: 2,
      status: CouponStatus.ACTIVE,
      requiresUserAccount: true,
      customMessage: "Você economizou 25% optando pelo plano anual!",
      appliesToAllPlans: true,
      billingIntervals: [BillingInterval.ANNUAL],
      createdById: context.adminUser.id,
    },
  ];

  // Lista para armazenar os cupons criados - definindo tipo explicitamente
  const createdCoupons: Coupon[] = [];

  // Criar os cupons
  for (const coupon of coupons) {
    const createdCoupon = await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: coupon,
      create: coupon,
    });
    console.log(`Cupom criado: ${createdCoupon.code} - ${createdCoupon.name}`);
    createdCoupons.push(createdCoupon);

    // Se o cupom não se aplica a todos os planos, configurar restrições específicas
    if (!coupon.appliesToAllPlans && coupon.code === "EMPRESA20") {
      // Buscar planos avançados
      const advancedPlans = await prisma.subscriptionPlan.findMany({
        where: {
          name: {
            in: ["Avançado", "Destaque"], // Aplicar apenas a planos avançados
          },
        },
      });

      // Criar restrições de plano
      for (const plan of advancedPlans) {
        // Usando upsert em vez de create para evitar erros de chave única
        await prisma.couponPlanRestriction.upsert({
          where: {
            couponId_planId: {
              couponId: createdCoupon.id,
              planId: plan.id,
            },
          },
          update: {}, // Não precisa atualizar nada, apenas garantir que existe
          create: {
            couponId: createdCoupon.id,
            planId: plan.id,
          },
        });
        console.log(
          `Restrição de plano criada para: ${coupon.code} - ${plan.name}`
        );
      }
    }
  }

  return {
    ...context,
    coupons: createdCoupons,
  };
}
