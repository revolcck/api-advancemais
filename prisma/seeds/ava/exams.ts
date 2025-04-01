import {
  ExamReleaseType,
  Question,
  QuestionBank,
  QuestionOrder,
  Status,
} from "@prisma/client";
import { SeedContext, prisma } from "../utils";

/**
 * Seed para criar provas de exemplo
 */
export async function seedExams(context: SeedContext): Promise<SeedContext> {
  console.log("Criando provas de exemplo...");

  if (!context.adminUser) {
    throw new Error(
      "Usuário administrador não encontrado no contexto. Execute o seed de usuários primeiro."
    );
  }

  // Verificar se temos o curso de exemplo
  const exampleCourse =
    context.exampleCourse ||
    (await prisma.course.findFirst({
      where: {
        slug: "conhecendo-o-mercado-digital",
      },
    }));

  if (!exampleCourse) {
    console.warn(
      "Curso de exemplo não encontrado. Não será possível criar provas."
    );
    return context;
  }

  // Verificar se temos módulos no curso
  const courseModules = await prisma.courseModule.findMany({
    where: {
      courseId: exampleCourse.id,
    },
    orderBy: {
      order: "asc",
    },
  });

  if (courseModules.length === 0) {
    console.warn(
      "Nenhum módulo encontrado no curso de exemplo. Não será possível criar provas vinculadas a módulos."
    );
  }

  // Verificar se temos banco de questões com suas questões
  let questionBank: (QuestionBank & { questions: Question[] }) | null = null;

  if (context.questionBanks?.[0]) {
    // Se temos do contexto, precisamos buscar as questões
    const bankFromContext = context.questionBanks[0];
    const bankWithQuestions = await prisma.questionBank.findUnique({
      where: {
        id: bankFromContext.id,
      },
      include: {
        questions: true,
      },
    });

    if (bankWithQuestions) {
      questionBank = bankWithQuestions;
    }
  } else {
    // Buscar do banco de dados
    questionBank = await prisma.questionBank.findFirst({
      where: {
        courseId: exampleCourse.id,
      },
      include: {
        questions: true,
      },
    });
  }

  if (!questionBank || questionBank.questions.length === 0) {
    console.warn(
      "Banco de questões não encontrado ou vazio. As provas serão criadas sem questões vinculadas."
    );
  }

  // Buscar uma aula para usar como referência nas questões
  const firstLesson = await prisma.lesson.findFirst({
    where: {
      module: {
        courseId: exampleCourse.id,
      },
    },
  });

  if (!firstLesson) {
    console.warn(
      "Nenhuma aula encontrada no curso. Algumas operações podem falhar."
    );
  }

  // Criar prova final do curso
  const finalExam = await prisma.exam.create({
    data: {
      title: "Prova teste",
      description:
        "Prova final do curso com questões sobre todos os conceitos abordados",
      weight: 5, // Peso 5 na média final
      passingPercentage: 60, // 60% para aprovação
      duration: 60, // 60 minutos
      trackDispersion: true, // Contabilizar dispersão
      notifyStudents: true, // Notificar alunos
      releaseType: ExamReleaseType.IMMEDIATELY, // Liberação imediata
      isRequired: true, // Prova obrigatória
      allowMultipleAttempts: true, // Permitir múltiplas tentativas
      maxAttempts: 2, // Máximo de 2 tentativas
      showAnswerAfterAttempt: false, // Não mostrar gabarito após tentativa
      attemptCooldownHours: 24, // 24 horas entre tentativas
      questionOrder: QuestionOrder.SEQUENTIAL, // Ordem sequencial
      courseId: exampleCourse.id, // Vínculo com o curso
      moduleId:
        courseModules.length > 0
          ? courseModules[courseModules.length - 1].id
          : null, // Último módulo
      createdById: context.adminUser.id,
    },
  });

  console.log(`Prova criada: ${finalExam.title}`);

  // Se temos um banco de questões com perguntas, vamos vincular à prova
  if (questionBank && questionBank.questions.length > 0) {
    // Adicionar todas as questões do banco à prova
    let order = 1;
    for (const question of questionBank.questions) {
      try {
        await prisma.examQuestionRelation.create({
          data: {
            examId: finalExam.id,
            questionId: question.id,
            order: order++,
            points: question.points || 1,
          },
        });
      } catch (error) {
        console.error(`Erro ao vincular questão à prova: ${error}`);
      }
    }

    // Atualizar o total de questões na prova
    await prisma.exam.update({
      where: { id: finalExam.id },
      data: { totalQuestions: questionBank.questions.length },
    });

    console.log(
      `${questionBank.questions.length} questões vinculadas à prova final`
    );
  }

  // Criar uma prova para o primeiro módulo (se existir)
  if (courseModules.length > 0) {
    const moduleExam = await prisma.exam.create({
      data: {
        title: "Avaliação de Conceitos Básicos",
        description:
          "Avaliação para testar o conhecimento dos conceitos básicos apresentados no primeiro módulo",
        weight: 3, // Peso 3 na média final
        passingPercentage: 70, // 70% para aprovação
        duration: 30, // 30 minutos
        trackDispersion: false, // Não contabilizar dispersão
        notifyStudents: true, // Notificar alunos
        releaseType: ExamReleaseType.IMMEDIATELY, // Liberação imediata
        isRequired: true, // Prova obrigatória
        allowMultipleAttempts: true, // Permitir múltiplas tentativas
        maxAttempts: 3, // Máximo de 3 tentativas
        showAnswerAfterAttempt: true, // Mostrar gabarito após tentativa
        questionOrder: QuestionOrder.RANDOM, // Ordem aleatória
        courseId: exampleCourse.id, // Vínculo com o curso
        moduleId: courseModules[0].id, // Primeiro módulo
        createdById: context.adminUser.id,
        totalQuestions: 2, // Número fixo, mesmo sem questões vinculadas ainda
      },
    });

    console.log(`Prova do módulo criada: ${moduleExam.title}`);

    // Verificar se temos uma aula para referenciar
    if (firstLesson) {
      // Criar duas questões específicas para esta prova (não vêm do banco de questões)
      const examQuestions = [
        {
          text: "Qual a cor do céu?",
          type: "multiple_choice",
          options: JSON.stringify(["Azul", "Verde", "Vermelho", "Amarelo"]),
          correctAnswer: "Azul",
          points: 1,
        },
        {
          text: "Quantos anos tem a EAD?",
          type: "multiple_choice",
          options: JSON.stringify(["1 ano", "2 anos", "5 anos", "10 anos"]),
          correctAnswer: "5 anos",
          points: 1,
        },
      ];

      // Criar as questões de exame separadas
      for (let i = 0; i < examQuestions.length; i++) {
        try {
          const examQuestion = await prisma.examQuestion.create({
            data: {
              lessonId: firstLesson.id, // Usar a primeira aula encontrada
              question: examQuestions[i].text,
              type: examQuestions[i].type,
              options: examQuestions[i].options,
              correctAnswer: examQuestions[i].correctAnswer,
              points: examQuestions[i].points,
            },
          });

          // Vincular à prova
          await prisma.examQuestionRelation.create({
            data: {
              examId: moduleExam.id,
              examQuestionId: examQuestion.id,
              order: i + 1,
              points: examQuestion.points,
            },
          });

          console.log(
            `Questão de exame criada: ${examQuestion.question.substring(
              0,
              30
            )}...`
          );
        } catch (error) {
          console.error(`Erro ao criar questão de exame: ${error}`);
        }
      }
    } else {
      console.warn(
        "Não foi possível criar questões de exame por falta de referência a uma aula."
      );
    }
  }

  return {
    ...context,
    exams: [finalExam],
  };
}
