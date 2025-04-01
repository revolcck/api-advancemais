import { SeedContext, prisma } from "../utils";

/**
 * Seed para criar notificações de aulas de exemplo
 */
export async function seedLessonNotifications(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando notificações de aulas...");

  // Buscar aulas publicadas que têm notifyStudents=true
  const publishedLessons = await prisma.lesson.findMany({
    where: {
      publishStatus: "PUBLISHED",
      notifyStudents: true,
    },
    take: 3, // Limitar a 3 aulas para exemplo
  });

  if (publishedLessons.length === 0) {
    console.warn("Nenhuma aula publicada com notificação encontrada.");
    return context;
  }

  console.log(
    `Encontradas ${publishedLessons.length} aulas para notificações.`
  );

  // Buscar alunos para enviar as notificações
  const students = await prisma.user.findMany({
    where: {
      role: {
        name: "Aluno",
      },
    },
    take: 5, // Limitar a 5 alunos para exemplo
  });

  if (students.length === 0) {
    console.warn("Nenhum aluno encontrado para enviar notificações.");
    return context;
  }

  // Criar notificações para cada aula publicada
  for (const lesson of publishedLessons) {
    try {
      // Buscar o módulo e curso relacionados
      const module = await prisma.courseModule.findUnique({
        where: { id: lesson.moduleId },
        include: { course: true },
      });

      if (!module) continue;

      // Criar a notificação
      const notification = await prisma.lessonNotification.create({
        data: {
          lessonId: lesson.id,
          title: `Nova aula disponível: ${lesson.title}`,
          message: `Uma nova aula foi disponibilizada no módulo "${module.title}" do curso "${module.course.title}". Acesse agora para conferir!`,
          isSent: true,
          sentAt: new Date(),
        },
      });

      console.log(`Notificação criada para a aula: ${lesson.title}`);

      // Criar relacionamentos com os alunos
      for (const student of students) {
        await prisma.userNotification.create({
          data: {
            notificationId: notification.id,
            userId: student.id,
            isRead: Math.random() > 0.5, // Aleatoriamente marcar algumas como lidas
            readAt: Math.random() > 0.5 ? new Date() : null,
          },
        });
      }

      console.log(`Notificação enviada para ${students.length} alunos`);
    } catch (error) {
      console.error(
        `Erro ao criar notificação para aula ${lesson.title}:`,
        error
      );
    }
  }

  return context;
}
