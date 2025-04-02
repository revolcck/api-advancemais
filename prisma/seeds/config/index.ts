import { BillingInterval, UserType } from "@prisma/client";
import { SeedGroupConfig } from "../utils/types";

/**
 * Configurações globais do seed
 */
export const CONFIG = {
  /**
   * Configurações do administrador padrão
   */
  admin: {
    email: "admin@sistema.com",
    password: "$2a$10$kIqR/PTloYan/MRNiEsy6uYO6OCHVmAKR4kFVbL9mA9Xt0f9w2IP6", // admin@123
    matricula: "AD999ZZ",
    name: "Administrador do Sistema",
    cpf: "00000000000",
  },

  /**
   * Configurações dos planos de assinatura
   */
  subscriptionPlans: [
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
      jobsConfig: {
        maxJobOffers: 3,
        featuredJobOffers: 0,
        confidentialOffers: false,
        resumeAccess: true,
        allowPremiumFilters: false,
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
      jobsConfig: {
        maxJobOffers: 10,
        featuredJobOffers: 0,
        confidentialOffers: false,
        resumeAccess: true,
        allowPremiumFilters: false,
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
      jobsConfig: {
        maxJobOffers: 20,
        featuredJobOffers: 0,
        confidentialOffers: true,
        resumeAccess: true,
        allowPremiumFilters: true,
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
      jobsConfig: {
        maxJobOffers: -1, // ilimitado
        featuredJobOffers: 1,
        confidentialOffers: true,
        resumeAccess: true,
        allowPremiumFilters: true,
      },
      isActive: true,
      isPopular: false,
    },
  ],

  /**
   * Configurações dos cupons de desconto
   */
  coupons: {
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
  },

  /**
   * Configurações dos papéis/funções do sistema
   */
  roles: [
    {
      name: "Professor",
      level: 1,
      status: 1,
      description: "Professores e instrutores",
    },
    {
      name: "Aluno",
      level: 2,
      status: 1,
      description: "Alunos do sistema",
    },
    {
      name: "Empresa",
      level: 3,
      status: 1,
      description: "Empresas parceiras",
    },
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
  ],

  /**
   * Constantes para identificar roles especiais
   */
  ROLES: {
    ADMIN: "Super Administrador",
    PROFESSOR: "Professor",
    ALUNO: "Aluno",
    EMPRESA: "Empresa",
    SETOR_PEDAGOGICO: "Setor Pedagógico",
    RECRUTADORES: "Recrutadores",
    RH: "Recursos Humanos",
    ADMINISTRADOR: "Administrador",
  },

  /**
   * Configurações de grupos de seeds
   */
  seedGroups: {
    // Grupo core - estrutura básica do sistema
    core: {
      name: "Core",
      description: "Seeds de estrutura básica do sistema",
      seeds: ["roles", "users"],
      defaultOptions: {
        stopOnError: true,
        logLevel: "verbose",
      },
    },

    // Grupo de pagamentos
    payments: {
      name: "Payments",
      description: "Seeds relacionados a pagamentos e assinaturas",
      seeds: ["subscriptionPlans", "paymentMethods", "coupons"],
      defaultOptions: {
        stopOnError: false,
        logLevel: "normal",
      },
    },

    // Grupo AVA
    ava: {
      name: "AVA",
      description: "Seeds de Ambiente Virtual de Aprendizagem",
      seeds: [
        "courseAreas",
        "courseCategories",
        "courseTypes",
        "lessonTypes",
        "examTypes",
        "courseModalities",
        "courses",
        "exampleCourse",
        "questionBanks",
        "exams",
        "lessonNotifications",
      ],
      defaultOptions: {
        stopOnError: false,
        logLevel: "normal",
      },
    },

    // Grupo de certificados
    certificates: {
      name: "Certificates",
      description: "Seeds relacionados a certificados",
      seeds: [
        "certificateTemplates",
        "coursesWithCertificateCriteria",
        "certificates",
      ],
      defaultOptions: {
        stopOnError: false,
        logLevel: "normal",
      },
    },

    // Grupo de vagas e recrutamento
    jobs: {
      name: "Jobs",
      description: "Seeds de sistema de vagas e recrutamento",
      seeds: ["planUpdates", "resumeSeeds", "jobOffers", "jobApplications"],
      defaultOptions: {
        stopOnError: false,
        logLevel: "normal",
      },
    },
  } as Record<string, SeedGroupConfig>,
};

export default CONFIG;
