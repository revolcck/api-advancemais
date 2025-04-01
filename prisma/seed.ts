import {
  PrismaClient,
  PaymentMethodType,
  BillingInterval,
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
