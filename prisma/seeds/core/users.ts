import { EducationLevel, User, UserType } from "@prisma/client";
import {
  SeedContext,
  prisma,
  logger,
  verifyContextRequirements,
  CodeGenerator,
} from "../utils";
import CONFIG from "../config";

/**
 * Seeds de usuários iniciais do sistema
 *
 * @param context Contexto de seed
 * @returns Contexto atualizado com usuários
 */
export async function seedUsers(context: SeedContext): Promise<SeedContext> {
  logger.info("Criando usuários iniciais do sistema...");

  // Verificar se temos roles no contexto
  verifyContextRequirements(context, ["adminRole", "roles"], "seedUsers");

  // Criar usuário administrador
  const adminUser = await createAdminUser(context);
  logger.entity("Administrador", adminUser.email);

  // Criar usuários de teste para os diferentes papéis
  const testUsers = await createTestUsers(context);

  logger.success(`Criados ${testUsers.length + 1} usuários no sistema`);

  return {
    ...context,
    adminUser,
    testUsers,
  };
}

/**
 * Cria o usuário administrador do sistema
 */
async function createAdminUser(context: SeedContext): Promise<User> {
  const { email, password, matricula, name, cpf } = CONFIG.admin;

  return prisma.user.upsert({
    where: { email },
    update: {},
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
}

/**
 * Cria usuários de teste para cada papel
 */
async function createTestUsers(context: SeedContext): Promise<User[]> {
  const createdUsers: User[] = [];
  const { roles } = context;

  // Criar um usuário para cada role (exceto admin que já foi criado)
  for (const role of roles.filter((r) => r.name !== CONFIG.ROLES.ADMIN)) {
    try {
      // Determinar tipo de usuário com base no papel
      const isCompany = role.name === CONFIG.ROLES.EMPRESA;
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
        update: {},
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
