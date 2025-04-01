import { SeedContext } from "../utils";
import { seedCourseAreas } from "./courseAreas";
import { seedCourseCategories } from "./courseCategories";
import { seedCourseTypes } from "./courseTypes";
import { seedLessonTypes } from "./lessonTypes";
import { seedExamTypes } from "./examTypes";

/**
 * Função principal para executar todos os seeds do AVA
 */
export async function seedAva(context: SeedContext): Promise<SeedContext> {
  console.log("Iniciando seed do AVA (Ambiente Virtual de Aprendizagem)...");

  // Executar seeds na ordem correta
  let updatedContext = await seedCourseAreas(context);
  updatedContext = await seedCourseCategories(updatedContext);
  updatedContext = await seedCourseTypes(updatedContext);
  updatedContext = await seedLessonTypes(updatedContext);
  updatedContext = await seedExamTypes(updatedContext);

  console.log("Seed do AVA finalizado com sucesso!");

  return updatedContext;
}
