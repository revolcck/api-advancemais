import { SeedContext, executeSeed } from "../utils";
import { seedCertificateTemplates } from "./certificateTemplates";
import { seedCoursesWithCertificateCriteria } from "./coursesWithCertificateCriteria";
import { seedCertificates } from "./certificates";

/**
 * Função principal para seed de certificados que executa todos os seeds relacionados
 */
export async function seedAllCertificates(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Iniciando seeds de certificados...");

  try {
    // Executar os seeds em ordem
    let currentContext = { ...context };

    // 1. Criar templates de certificados
    currentContext = await executeSeed(
      "Templates de Certificado",
      seedCertificateTemplates,
      currentContext
    );

    // 2. Atualizar cursos com critérios de certificados
    currentContext = await executeSeed(
      "Cursos com Critérios de Certificado",
      seedCoursesWithCertificateCriteria,
      currentContext
    );

    // 3. Criar certificados de exemplo
    currentContext = await executeSeed(
      "Certificados Emitidos",
      seedCertificates,
      currentContext
    );

    console.log("Seeds de certificados concluídos com sucesso!");
    return currentContext;
  } catch (error) {
    console.error("Erro durante a execução dos seeds de certificados:", error);
    throw error;
  }
}
