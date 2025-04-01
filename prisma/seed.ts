import {
  PrismaClient,
  PaymentMethodType,
  BillingInterval,
  UserType,
  DiscountType,
  CouponStatus,
} from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Limpar dados existentes nas tabelas (cuidado em produção)
  // await prisma.role.deleteMany();

  // Array de roles conforme especificado
  const roles = [
    {
      name: "Professor",
      level: 1,
      status: 1,
      description: "Professores e instrutores",
    },
    { name: "Aluno", level: 2, status: 1, description: "Alunos do sistema" },
    { name: "Empresa", level: 3, status: 1, description: "Empresas parceiras" },
    {
      name: "Administrador",
      level: 4,
      status: 1,
      description: "Administradores do sistema",
    },
    {
      name: "Recrutadores",
      level: 5,
      status: 1,
      description: "Profissionais de recrutamento",
    },
    {
      name: "Setor Pedagógico",
      level: 6,
      status: 1,
      description: "Equipe pedagógica",
    },
    {
      name: "Recursos Humanos",
      level: 7,
      status: 1,
      description: "Equipe de RH",
    },
    {
      name: "Super Administrador",
      level: 8,
      status: 1,
      description: "Acesso total ao sistema",
    },
  ];

  console.log("Iniciando seed...");

  // Inserir roles no banco de dados
  for (const role of roles) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: role,
      create: role,
    });
    console.log(`Role criada: ${createdRole.name}`);
  }

  // ============ SEED DE PLANOS DE ASSINATURA ============
  console.log("Criando planos de assinatura...");

  const subscriptionPlans = [
    {
      name: "Inicial",
      price: 49.99,
      description:
        "Aumente a produtividade e a criatividade com o acesso expandido.",
      interval: BillingInterval.MONTHLY,
      intervalCount: 1,
      features: {
        tagline: "Comece a recrutar com eficiência",
        vacancies: 3,
        advertisingDays: 30,
        qualifiedCandidates: true,
        basicControl: true,
        featuredVacancy: false,
        advancedControl: false,
        benefitsList: [
          "3 vagas ativas",
          "30 dias de divulgação",
          "Acesso a candidatos qualificados",
          "Painel de controle básico",
        ],
      },
      isActive: true,
      isPopular: false,
    },
    {
      name: "Intermediário",
      price: 74.99,
      description:
        "Aumente a produtividade e a criatividade com o acesso expandido.",
      interval: BillingInterval.MONTHLY,
      intervalCount: 1,
      features: {
        tagline: "Amplie seu alcance de recrutamento",
        vacancies: 10,
        advertisingDays: 30,
        qualifiedCandidates: true,
        basicControl: true,
        featuredVacancy: false,
        advancedControl: false,
        benefitsList: [
          "10 vagas ativas",
          "30 dias de divulgação",
          "Acesso a candidatos qualificados",
          "Painel de controle básico",
        ],
      },
      isActive: true,
      isPopular: false,
    },
    {
      name: "Avançado",
      price: 99.99,
      description:
        "Aumente a produtividade e a criatividade com o acesso expandido.",
      interval: BillingInterval.MONTHLY,
      intervalCount: 1,
      features: {
        tagline: "Solução completa para grandes equipes",
        vacancies: 20,
        advertisingDays: 30,
        qualifiedCandidates: true,
        basicControl: true,
        featuredVacancy: false,
        advancedControl: false,
        benefitsList: [
          "20 vagas ativas",
          "30 dias de divulgação",
          "Acesso a candidatos qualificados",
          "Painel de controle básico",
        ],
      },
      isActive: true,
      isPopular: true,
    },
    {
      name: "Destaque",
      price: 199.99,
      description:
        "Aumente a produtividade e a criatividade com o acesso expandido.",
      interval: BillingInterval.MONTHLY,
      intervalCount: 1,
      features: {
        tagline: "Recrutamento sem limites",
        vacancies: -1, // -1 representa vagas ilimitadas
        advertisingDays: 30,
        qualifiedCandidates: true,
        basicControl: false, // Não tem painel básico, mas avançado
        featuredVacancy: true,
        advancedControl: true,
        benefitsList: [
          "Vagas ilimitadas",
          "30 dias de divulgação",
          "Acesso a candidatos qualificados",
          "Painel de controle avançado",
          "1 vaga em destaque",
        ],
      },
      isActive: true,
      isPopular: false,
    },
  ];

  for (const plan of subscriptionPlans) {
    const createdPlan = await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(`Plano criado: ${createdPlan.name} - R$ ${createdPlan.price}`);
  }

  // ============ SEED DE MÉTODOS DE PAGAMENTO (MERCADO PAGO) ============
  console.log("Criando métodos de pagamento do Mercado Pago...");

  const paymentMethods = [
    {
      type: PaymentMethodType.CREDIT_CARD,
      name: "Cartão de Crédito",
      description: "Pagamento via cartão de crédito (Visa, Mastercard, etc.)",
      mpPaymentTypeId: "credit_card",
      processingFee: 4.99, // 4.99% de taxa
      requiredFields: {
        cardNumber: true,
        cardholderName: true,
        expirationDate: true,
        securityCode: true,
        identificationNumber: true,
        identificationType: true,
      },
      isActive: true,
    },
    {
      type: PaymentMethodType.DEBIT_CARD,
      name: "Cartão de Débito",
      description: "Pagamento via cartão de débito",
      mpPaymentTypeId: "debit_card",
      processingFee: 3.99, // 3.99% de taxa
      requiredFields: {
        cardNumber: true,
        cardholderName: true,
        expirationDate: true,
        securityCode: true,
        identificationNumber: true,
        identificationType: true,
      },
      isActive: true,
    },
    {
      type: PaymentMethodType.PIX,
      name: "PIX",
      description: "Transferência instantânea via PIX",
      mpPaymentTypeId: "pix",
      processingFee: 1.99, // 1.99% de taxa
      requiredFields: {},
      isActive: true,
    },
    {
      type: PaymentMethodType.BANK_SLIP,
      name: "Boleto Bancário",
      description: "Pagamento via boleto bancário",
      mpPaymentTypeId: "ticket",
      mpPaymentMethodId: "bolbradesco",
      processingFee: 2.99, // 2.99% de taxa
      fixedFee: 3.0, // R$ 3,00 de taxa fixa
      requiredFields: {
        firstName: true,
        lastName: true,
        email: true,
        identificationNumber: true,
        identificationType: true,
      },
      isActive: true,
    },
    {
      type: PaymentMethodType.MP_CHECKOUT,
      name: "Checkout Mercado Pago",
      description: "Checkout completo do Mercado Pago com todos os métodos",
      mpPaymentTypeId: "mp_checkout",
      processingFee: 4.99, // 4.99% de taxa
      isActive: true,
    },
  ];

  for (const method of paymentMethods) {
    const createdMethod = await prisma.paymentMethod.upsert({
      where: {
        // Como não temos um campo único para método de pagamento,
        // criamos uma condição composta para o upsert
        id:
          (
            await prisma.paymentMethod.findFirst({
              where: { type: method.type, name: method.name },
            })
          )?.id || "",
      },
      update: method,
      create: method,
    });
    console.log(`Método de pagamento criado: ${createdMethod.name}`);
  }

  // ============ SEED DE USUÁRIO ADMINISTRADOR ============
  console.log("Criando usuário administrador...");

  // Encontrar role de administrador
  const adminRole = await prisma.role.findFirst({
    where: { name: "Super Administrador" },
  });

  if (!adminRole) {
    console.error("Role de Super Administrador não encontrada!");
    return;
  }

  // Criar usuário administrador para associar aos cupons
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@sistema.com" },
    update: {},
    create: {
      email: "admin@sistema.com",
      // Senha: admin@123 (em produção, use um hash real e seguro)
      password: "$2a$10$kIqR/PTloYan/MRNiEsy6uYO6OCHVmAKR4kFVbL9mA9Xt0f9w2IP6",
      userType: UserType.PESSOA_FISICA,
      matricula: "AD999ZZ",
      isActive: true,
      roleId: adminRole.id,
      personalInfo: {
        create: {
          name: "Administrador do Sistema",
          cpf: "00000000000",
          birthDate: new Date("1990-01-01"),
          gender: "NAO_INFORMADO",
          phone: "0000000000",
        },
      },
    },
  });

  console.log(`Usuário administrador criado: ${adminUser.email}`);

  // ============ SEED DE CUPONS DE DESCONTO ============
  console.log("Criando cupons de desconto...");

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
      createdById: adminUser.id,
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
      createdById: adminUser.id,
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
      createdById: adminUser.id,
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
      createdById: adminUser.id,
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
      createdById: adminUser.id,
    },
  ];

  // Criar os cupons
  for (const coupon of coupons) {
    const createdCoupon = await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: coupon,
      create: coupon,
    });
    console.log(`Cupom criado: ${createdCoupon.code} - ${createdCoupon.name}`);

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
        await prisma.couponPlanRestriction.create({
          data: {
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

  console.log("Seed finalizado com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
