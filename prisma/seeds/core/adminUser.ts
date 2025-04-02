import { EducationLevel, User, UserType } from "@prisma/client";
import {
  SeedContext,
  prisma,
  logger,
  verifyContextRequirements,
} from "../utils";
import { adminConfig } from "../config/admin.config";

/**
 * Cria o usuário administrador principal do sistema
 *
 * @param context Contexto de seed
 * @returns Contexto atualizado com o usuário administrador
 */
export async function seedAdminUser(
  context: SeedContext
): Promise<SeedContext> {
  logger.subSection("Criando usuário administrador");

  // Verificar dependências no contexto
  verifyContextRequirements(context, ["adminRole"], "seedAdminUser");

  // Após a verificação, podemos garantir que adminRole existe
  if (!context.adminRole) {
    throw new Error(
      "adminRole não encontrado no contexto, mesmo após verificação"
    );
  }

  const { email, password, matricula, name, cpf } = adminConfig;

  try {
    // Criar ou atualizar o administrador
    const adminUser = await prisma.user.upsert({
      where: { email },
      update: {}, // Não atualiza dados do admin se já existir
      create: {
        email,
        password, // Já é um hash pré-definido na configuração
        userType: UserType.PESSOA_FISICA,
        matricula,
        isActive: true,
        roleId: context.adminRole.id,
        personalInfo: {
          create: {
            name,
            cpf,
            birthDate: new Date("1990-01-01"),
            gender: "NAO_INFORMADO",
            phone: "0000000000",
            educationLevel: EducationLevel.DOUTORADO,
          },
        },
      },
      include: {
        personalInfo: true,
        role: true,
      },
    });

    logger.success(`Administrador criado: ${adminUser.email}`);

    return {
      ...context,
      adminUser,
    };
  } catch (error) {
    logger.error("Erro ao criar usuário administrador:", error);
    throw error;
  }
}
