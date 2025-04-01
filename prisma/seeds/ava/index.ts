import { SeedContext } from "../utils";
import { seedCourseAreas } from "./courseAreas";
import { seedCourseCategories } from "./courseCategories";
import { seedCourseTypes } from "./courseTypes";
import { seedLessonTypes } from "./lessonTypes";
import { seedExamTypes } from "./examTypes";
import { seedCourseModalities } from "./courseModalities";
import { seedCourses } from "./courses";
import { seedExampleCourse } from "./exampleCourse";

export async function seedAva(context: SeedContext): Promise<SeedContext> {
  console.log("Iniciando seed do AVA (Ambiente Virtual de Aprendizagem)...");

  try {
    // Executar seeds na ordem correta
    let updatedContext = await seedCourseAreas(context);
    updatedContext = await seedCourseCategories(updatedContext);
    updatedContext = await seedCourseTypes(updatedContext);
    updatedContext = await seedLessonTypes(updatedContext);
    updatedContext = await seedExamTypes(updatedContext);
    updatedContext = await seedCourseModalities(updatedContext);

    // Criar vários cursos básicos
    updatedContext = await seedCourses(updatedContext);

    // Criar um curso de exemplo com módulos e aulas detalhadas
    updatedContext = await seedExampleCourse(updatedContext);

    console.log("Seed do AVA finalizado com sucesso!");
    return updatedContext;
  } catch (error) {
    console.error("Erro durante a execução do seed do AVA:", error);
    throw error;
  }
}
