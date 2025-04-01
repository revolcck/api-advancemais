import {
  DifficultyLevel,
  QuestionBank,
  QuestionType,
  Status,
} from "@prisma/client";
import { SeedContext, prisma } from "../utils";

/**
 * Seed para criar bancos de questões
 */
export async function seedQuestionBanks(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando bancos de questões...");

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
      "Curso de exemplo não encontrado. Criando banco de questões sem vínculo com curso."
    );
  }

  // Criar banco de questões
  const questionBank = await prisma.questionBank.create({
    data: {
      title: "Banco de Questões sobre Marketing Digital",
      description:
        "Questões relacionadas aos fundamentos do marketing digital e conceitos básicos",
      courseId: exampleCourse?.id,
      createdById: context.adminUser.id,
      status: Status.ACTIVE,
    },
  });

  console.log(`Banco de questões criado: ${questionBank.title}`);

  // Criar questões para o banco
  const questionsData = [
    {
      text: "O que está achando da nova versão?",
      type: QuestionType.MULTIPLA_ESCOLHA,
      difficultyLevel: DifficultyLevel.FACIL,
      options: JSON.stringify([
        "Ainda não experimentei o suficiente para opinar",
        "Não gostei das mudanças",
        "Gostei, mas acho que precisa de melhorias",
        "Lindo, muito moderno!",
      ]),
      correctAnswer: JSON.stringify(3), // Índice da resposta correta (começa em 0)
      solution:
        "A opção 'Lindo, muito moderno!' representa a resposta mais positiva sobre a nova versão.",
      points: 1,
      order: 1,
    },
    {
      text: "O que achou das novas configurações?",
      type: QuestionType.MULTIPLA_ESCOLHA,
      difficultyLevel: DifficultyLevel.MEDIO,
      options: JSON.stringify([
        "Ainda não explorei totalmente",
        "Estão confusas e difíceis de usar",
        "São úteis, mas poderiam ser mais intuitivas",
        "Muito bem organizadas e intuitivas",
      ]),
      correctAnswer: JSON.stringify(3), // Índice da resposta correta
      solution:
        "As novas configurações foram projetadas para serem bem organizadas e intuitivas, facilitando a experiência do usuário.",
      points: 1,
      order: 2,
    },
    {
      text: "O que achou do novo layout?",
      type: QuestionType.MULTIPLA_ESCOLHA,
      difficultyLevel: DifficultyLevel.MEDIO,
      options: JSON.stringify([
        "Não gostei, preferia o antigo",
        "Indiferente, cumpre a função básica",
        "Visualmente melhor, mas com problemas de usabilidade",
        "Lindo, muito moderno!",
      ]),
      correctAnswer: JSON.stringify(3), // Índice da resposta correta
      solution:
        "O novo layout foi redesenhado para ser mais moderno e visualmente atraente, mantendo boa usabilidade.",
      points: 1,
      order: 3,
    },
    {
      text: "Selecione os benefícios do marketing digital que você conhece:",
      type: QuestionType.MULTIPLA_SELECAO,
      difficultyLevel: DifficultyLevel.DIFICIL,
      options: JSON.stringify([
        "Maior alcance de público",
        "Menor custo que marketing tradicional",
        "Métricas mais precisas",
        "Automação de processos",
        "Menor segmentação de público",
      ]),
      correctAnswer: JSON.stringify([0, 1, 2, 3]), // Índices das respostas corretas
      solution:
        "O marketing digital oferece maior alcance, menor custo, métricas precisas e automação. A menor segmentação não é um benefício, pelo contrário, o marketing digital permite maior segmentação.",
      points: 2,
      order: 4,
    },
    {
      text: "Teste",
      type: QuestionType.MULTIPLA_ESCOLHA,
      difficultyLevel: DifficultyLevel.FACIL,
      options: JSON.stringify(["Opção 1", "Opção 2", "Opção 3", "Opção 4"]),
      correctAnswer: JSON.stringify(2), // Índice da resposta correta
      solution: "A opção 3 é a correta para este teste.",
      points: 1,
      order: 5,
    },
  ];

  // Criar as questões
  for (const questionData of questionsData) {
    try {
      const question = await prisma.question.create({
        data: {
          ...questionData,
          questionBankId: questionBank.id,
          createdById: context.adminUser.id,
          status: Status.ACTIVE,
        },
      });
      console.log(`Questão criada: ${question.text.substring(0, 30)}...`);
    } catch (error) {
      console.error(`Erro ao criar questão: ${error}`);
    }
  }

  // Retornar o contexto atualizado
  return {
    ...context,
    questionBanks: [questionBank],
  };
}
