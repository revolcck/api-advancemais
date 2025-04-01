import { EducationLevel, UserType } from "@prisma/client";
import { SeedContext, prisma } from "./utils";

/**
 * Seed para criar usuários iniciais do sistema
 */
export async function seedUsers(context: SeedContext): Promise<SeedContext> {
  console.log("Criando usuário administrador...");

  if (!context.adminRole) {
    throw new Error(
      "Role de administrador não encontrada no contexto. Execute o seed de roles primeiro."
    );
  }

  // Criar usuário administrador
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@sistema.com" },
    update: {},
    create: {
      email: "admin@sistema.com",
      // Senha: admin@123 (em produção, use um hash real e seguro)
      password: "$2a$10$kIqR/PTloYan/MRNiEsy6uYO6OCHVmAKR4kFVbL9mA9Xt0f9w2IP6",
      userType: UserType.PESSOA_FISICA,
      matricula: "AD999ZZ",
      isActive: true,
      roleId: context.adminRole.id,
      personalInfo: {
        create: {
          name: "Administrador do Sistema",
          cpf: "00000000000",
          birthDate: new Date("1990-01-01"),
          gender: "NAO_INFORMADO",
          phone: "0000000000",
          educationLevel: EducationLevel.DOUTORADO,
        },
      },
    },
  });

  console.log(`Usuário administrador criado: ${adminUser.email}`);

  // Opcional: Criar outros usuários para testes
  // ...

  return {
    ...context,
    adminUser,
  };
}
