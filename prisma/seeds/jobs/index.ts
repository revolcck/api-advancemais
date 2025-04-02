import { SeedContext, verifyContextRequirements, executeSeed } from "../utils";
import { updateSubscriptionPlansWithJobLimits } from "./planUpdates";
import { seedStudentResumes } from "./resumeSeeds";
import { seedJobOffers } from "./jobOffersSeeds";
import { seedJobApplications } from "./jobApplicationsSeeds";

/**
 * Arquivo principal para o seed do sistema de vagas
 * Orquestra a execução de todos os sub-seeds em ordem correta
 */
export async function seedJobSystem(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Iniciando seed do Sistema de Vagas e Recrutamento...");

  // Verificar requisitos comuns para o módulo de vagas
  verifyContextRequirements(context, ["adminUser"], "módulo de vagas");

  try {
    let currentContext = { ...context };

    // Define os seeds a serem executados, com nomes amigáveis para log
    const jobsSeeds = [
      {
        name: "Atualização de Planos",
        fn: updateSubscriptionPlansWithJobLimits,
      },
      { name: "Currículos de Alunos", fn: seedStudentResumes },
      { name: "Vagas", fn: seedJobOffers },
      { name: "Candidaturas", fn: seedJobApplications },
    ];

    // Executar os seeds em ordem sequencial, passando o contexto entre eles
    for (const seed of jobsSeeds) {
      try {
        currentContext = await executeSeed(seed.name, seed.fn, currentContext);
      } catch (error) {
        console.error(
          `Erro no seed ${seed.name}, mas continuando com os próximos seeds...`
        );
      }
    }

    console.log("Seed do Sistema de Vagas finalizado com sucesso!");
    return currentContext;
  } catch (error) {
    console.error(
      "Erro fatal durante a execução do seed do Sistema de Vagas:",
      error
    );
    throw error;
  }
}
