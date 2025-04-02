import { SeedGroupsConfig } from "./types";

/**
 * Configurações de grupos de seeds
 * Define como os seeds serão organizados e executados
 */
export const seedGroupsConfig: SeedGroupsConfig = {
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
};
