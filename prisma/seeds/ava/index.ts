import { SeedContext, verifyContextRequirements, executeSeed } from "../utils";
import { seedCourseAreas } from "./courseAreas";
import { seedCourseCategories } from "./courseCategories";
import { seedCourseTypes } from "./courseTypes";
import { seedLessonTypes } from "./lessonTypes";
import { seedExamTypes } from "./examTypes";
import { seedCourseModalities } from "./courseModalities";
import { seedCourses } from "./courses";
import { seedExampleCourse } from "./exampleCourse";
import { seedQuestionBanks } from "./questionBanks";
import { seedExams } from "./exams";
import { seedLessonNotifications } from "./lessonNotifications";

// Organizar os seeds do AVA em grupos lógicos
const avaSeeds = [
  // Configurações básicas do AVA
  { name: "Áreas de Curso", fn: seedCourseAreas },
  { name: "Categorias de Curso", fn: seedCourseCategories },
  { name: "Tipos de Curso", fn: seedCourseTypes },
  { name: "Tipos de Aula", fn: seedLessonTypes },
  { name: "Tipos de Exame", fn: seedExamTypes },
  { name: "Modalidades de Curso", fn: seedCourseModalities },

  // Conteúdo do AVA
  { name: "Cursos Básicos", fn: seedCourses },
  { name: "Curso de Exemplo", fn: seedExampleCourse },
  { name: "Bancos de Questões", fn: seedQuestionBanks },
  { name: "Exames", fn: seedExams },

  // Funcionalidades adicionais
  { name: "Notificações de Aulas", fn: seedLessonNotifications },
];

/**
 * Seed principal do AVA que orquestra todos os sub-seeds
 */
export async function seedAva(context: SeedContext): Promise<SeedContext> {
  console.log("Iniciando seed do AVA (Ambiente Virtual de Aprendizagem)...");

  // Verificar requisitos comuns para o módulo AVA
  verifyContextRequirements(context, ["adminUser"], "módulo AVA");

  try {
    let currentContext = { ...context };

    // Executar seeds na ordem definida
    for (const seed of avaSeeds) {
      try {
        currentContext = await executeSeed(seed.name, seed.fn, currentContext);
      } catch (error) {
        console.error(
          `Erro no seed ${seed.name}, mas continuando com os próximos seeds...`
        );
      }
    }

    console.log("Seed do AVA finalizado com sucesso!");
    return currentContext;
  } catch (error) {
    console.error("Erro fatal durante a execução do seed do AVA:", error);
    throw error;
  }
}
