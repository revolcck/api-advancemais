import { EducationLevel, User, UserType } from "@prisma/client";
import {
  SeedContext,
  prisma,
  logger,
  verifyContextRequirements,
  CodeGenerator,
} from "../utils";
import { ROLES } from "../config/roles.config";

/**
 * Cria usuários iniciais de teste para o sistema
 *
 * @param context Contexto de seed
 * @returns Contexto atualizado com usuários de teste
 */
export async function seedUsers(context: SeedContext): Promise<SeedContext> {
  logger.subSection("Criando usuários de teste");

  // Verificar dependências no contexto
  verifyContextRequirements(context, ["roles", "adminUser"], "seedUsers");

  // Garantir que roles existe após a verificação
  if (!context.roles || !context.roles.length) {
    throw new Error(
      "Roles não encontradas no contexto, mesmo após verificação"
    );
  }

  // Criar usuários de teste para cada papel
  const testUsers = await createTestUsers(context);

  logger.success(`Criados ${testUsers.length} usuários de teste`);

  return {
    ...context,
    testUsers,
  };
}

/**
 * Cria usuários de teste para cada papel
 */
async function createTestUsers(context: SeedContext): Promise<User[]> {
  const createdUsers: User[] = [];

  // Garantir que roles existe
  if (!context.roles) {
    throw new Error("Roles não encontradas no contexto");
  }

  const { roles } = context;

  // Criar um usuário para cada role (exceto admin que já foi criado)
  for (const role of roles.filter((r) => r.name !== ROLES.ADMIN)) {
    try {
      // Determinar tipo de usuário com base no papel
      const isCompany = role.name === ROLES.EMPRESA;
      const userType = isCompany
        ? UserType.PESSOA_JURIDICA
        : UserType.PESSOA_FISICA;

      // Gerar matrícula única
      const matricula = CodeGenerator.generateMatricula(userType);

      // Gerar email baseado no papel
      const email = `${role.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")}@teste.com`;

      // Criar o usuário
      const user = await prisma.user.upsert({
        where: { email },
        update: {}, // Não atualiza se já existir
        create: {
          email,
          // Senha: senha123
          password:
            "$2a$10$7AgJ/DxbkJH6aNcmBFAYUOQjMBBjsM9C7FimOtS3XTCq0yqvBpvTO",
          userType,
          matricula,
          isActive: true,
          roleId: role.id,
          // Criar informações específicas baseadas no tipo
          ...(isCompany
            ? {
                companyInfo: {
                  create: {
                    companyName: `Empresa ${role.name}`,
                    tradeName: `${role.name} LTDA`,
                    legalName: `${role.name.toUpperCase()} EMPRESA LTDA`,
                    cnpj: `${Math.floor(
                      10000000000000 + Math.random() * 89999999999999
                    )}`,
                    phone: `(11) ${Math.floor(
                      10000000 + Math.random() * 89999999
                    )}`,
                  },
                },
              }
            : {
                personalInfo: {
                  create: {
                    name: `Usuário ${role.name}`,
                    cpf: `${Math.floor(
                      10000000000 + Math.random() * 89999999999
                    )}`,
                    birthDate: new Date(
                      1980 + Math.floor(Math.random() * 20),
                      Math.floor(Math.random() * 12),
                      Math.floor(1 + Math.random() * 28)
                    ),
                    gender: "NAO_INFORMADO",
                    phone: `(11) ${Math.floor(
                      10000000 + Math.random() * 89999999
                    )}`,
                    educationLevel: EducationLevel.ENSINO_SUPERIOR_COMPLETO,
                  },
                },
              }),
        },
      });

      logger.entity("Usuário", `${user.email} (${role.name})`);
      createdUsers.push(user);
    } catch (error) {
      logger.error(`Erro ao criar usuário para papel ${role.name}:`, error);
    }
  }

  return createdUsers;
}
