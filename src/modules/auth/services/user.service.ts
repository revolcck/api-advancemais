import { prisma } from "@/config/database";
import { HashUtils } from "@/shared/utils/hash.utils";
import { ConflictError, ValidationError } from "@/shared/errors/AppError";
import { logger } from "@/shared/utils/logger.utils";
import { PrismaClient, Prisma } from "@prisma/client";

// Define enumerações correspondentes ao schema.prisma
enum Gender {
  MASCULINO = "MASCULINO",
  FEMININO = "FEMININO",
  OUTRO = "OUTRO",
  NAO_INFORMADO = "NAO_INFORMADO",
}

enum MaritalStatus {
  SOLTEIRO = "SOLTEIRO",
  CASADO = "CASADO",
  DIVORCIADO = "DIVORCIADO",
  VIUVO = "VIUVO",
  UNIAO_ESTAVEL = "UNIAO_ESTAVEL",
  OUTRO = "OUTRO",
}

enum UserType {
  PESSOA_FISICA = "PESSOA_FISICA",
  PESSOA_JURIDICA = "PESSOA_JURIDICA",
}

import {
  RegisterPessoaFisicaDto,
  RegisterPessoaJuridicaDto,
} from "../dto/auth.dto";

/**
 * Serviço para gerenciamento de usuários
 */
export class UserService {
  /**
   * Gera uma matrícula única para o usuário
   * Formato: 2 letras + 3 números + 2 letras (ex: AD158KJ)
   */
  private async generateMatricula(): Promise<string> {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Sem I e O para evitar confusão

    let isUnique = false;
    let matricula = "";

    while (!isUnique) {
      // Gera 2 letras iniciais aleatórias
      const firstPart =
        characters.charAt(Math.floor(Math.random() * characters.length)) +
        characters.charAt(Math.floor(Math.random() * characters.length));

      // Gera 3 números aleatórios entre 100 e 999
      const numberPart = Math.floor(Math.random() * 900 + 100).toString();

      // Gera 2 letras finais aleatórias
      const lastPart =
        characters.charAt(Math.floor(Math.random() * characters.length)) +
        characters.charAt(Math.floor(Math.random() * characters.length));

      // Combina as partes
      matricula = firstPart + numberPart + lastPart;

      // Verifica se a matrícula já existe
      const existingUser = await prisma.user.findUnique({
        where: { matricula },
      });

      if (!existingUser) {
        isUnique = true;
      }
    }

    return matricula;
  }

  /**
   * Busca um usuário pelo CPF
   */
  public async findByCPF(cpf: string) {
    // Primeiro, procura o registro de PersonalInfo que contém o CPF
    const personalInfo = await prisma.personalInfo.findUnique({
      where: { cpf },
      include: {
        user: {
          include: {
            role: true,
          },
        },
      },
    });

    return personalInfo?.user;
  }

  /**
   * Busca um usuário pelo CNPJ
   */
  public async findByCNPJ(cnpj: string) {
    // Primeiro, procura o registro de CompanyInfo que contém o CNPJ
    const companyInfo = await prisma.companyInfo.findUnique({
      where: { cnpj },
      include: {
        user: {
          include: {
            role: true,
          },
        },
      },
    });

    return companyInfo?.user;
  }

  /**
   * Busca um usuário pelo documento (CPF ou CNPJ)
   */
  public async findByDocument(document: string) {
    // Remove caracteres não numéricos para facilitar a comparação
    const cleanDocument = document.replace(/\D/g, "");

    if (cleanDocument.length === 11) {
      // É um CPF
      return this.findByCPF(cleanDocument);
    } else if (cleanDocument.length === 14) {
      // É um CNPJ
      return this.findByCNPJ(cleanDocument);
    }

    return null;
  }

  /**
   * Busca um usuário pelo email
   */
  public async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        personalInfo: true,
        companyInfo: true,
      },
    });
  }

  /**
   * Busca um usuário pelo ID
   */
  public async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        personalInfo: true,
        companyInfo: true,
      },
    });
  }

  /**
   * Verifica se um email já está em uso
   */
  public async validateUniqueEmail(email: string): Promise<void> {
    const existingUser = await this.findByEmail(email);

    if (existingUser) {
      logger.warn(`Email já está em uso: ${email}`);
      throw new ConflictError("Email já está em uso");
    }
  }

  /**
   * Verifica se um CPF já está em uso
   */
  public async validateUniqueCPF(cpf: string): Promise<void> {
    // Remove caracteres não numéricos
    const cleanCPF = cpf.replace(/\D/g, "");

    const existing = await prisma.personalInfo.findUnique({
      where: { cpf: cleanCPF },
    });

    if (existing) {
      logger.warn(`CPF já está em uso: ${cpf}`);
      throw new ConflictError("CPF já está em uso");
    }
  }

  /**
   * Verifica se um CNPJ já está em uso
   */
  public async validateUniqueCNPJ(cnpj: string): Promise<void> {
    // Remove caracteres não numéricos
    const cleanCNPJ = cnpj.replace(/\D/g, "");

    const existing = await prisma.companyInfo.findUnique({
      where: { cnpj: cleanCNPJ },
    });

    if (existing) {
      logger.warn(`CNPJ já está em uso: ${cnpj}`);
      throw new ConflictError("CNPJ já está em uso");
    }
  }

  /**
   * Valida a força da senha
   */
  public async validatePasswordStrength(password: string): Promise<void> {
    if (!HashUtils.isStrongPassword(password)) {
      logger.warn(`Senha não atende aos requisitos de segurança`);
      throw new ValidationError("Senha não atende aos requisitos de segurança");
    }
  }

  /**
   * Valida se a senha fornecida corresponde ao hash
   */
  public async validatePassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return HashUtils.compare(password, hash);
  }

  /**
   * Cria um novo usuário pessoa física
   */
  public async createPessoaFisica(data: RegisterPessoaFisicaDto) {
    try {
      // Valida CPF único
      await this.validateUniqueCPF(data.cpf);

      // Valida email único
      await this.validateUniqueEmail(data.email);

      // Gera hash da senha
      const hashedPassword = await HashUtils.hash(data.password);

      // Gera matrícula
      const matricula = await this.generateMatricula();

      // Busca o papel padrão se não for informado
      let roleId = data.roleId;
      if (!roleId) {
        const defaultRole = await prisma.role.findFirst({
          where: { name: "Aluno" },
        });
        roleId = defaultRole?.id;

        if (!roleId) {
          throw new ValidationError("Papel padrão não encontrado");
        }
      }

      // Prepara data de nascimento
      const birthDate = new Date(data.birthDate);

      // Remove formatação do CPF
      const cpf = data.cpf.replace(/\D/g, "");

      // Cria o usuário com transação para garantir consistência
      const result = await prisma.$transaction(async (tx) => {
        // Cria o usuário base
        const user = await tx.user.create({
          data: {
            email: data.email,
            password: hashedPassword,
            userType: UserType.PESSOA_FISICA,
            matricula,
            roleId,
            isActive: true,
          },
        });

        // Cria informações pessoais
        const personalInfo = await tx.personalInfo.create({
          data: {
            name: data.name,
            cpf,
            rg: data.rg,
            birthDate,
            gender: data.gender as Gender,
            phone: data.phone,
            companyName: data.companyName,
            maritalStatus: data.maritalStatus as MaritalStatus,
            userId: user.id,
          },
        });

        // Cria endereço se informado
        if (data.address) {
          await tx.address.create({
            data: {
              ...data.address,
              userId: user.id,
            },
          });
        }

        // Retorna usuário com suas informações
        return await tx.user.findUnique({
          where: { id: user.id },
          include: {
            role: true,
            personalInfo: true,
            address: true,
          },
        });
      });

      logger.info(`Usuário pessoa física criado com sucesso: ${result?.email}`);

      return result;
    } catch (error) {
      logger.error("Erro ao criar usuário pessoa física", error);
      throw error;
    }
  }

  /**
   * Cria um novo usuário pessoa jurídica
   */
  public async createPessoaJuridica(data: RegisterPessoaJuridicaDto) {
    try {
      // Valida CNPJ único
      await this.validateUniqueCNPJ(data.cnpj);

      // Valida email único
      await this.validateUniqueEmail(data.email);

      // Gera hash da senha
      const hashedPassword = await HashUtils.hash(data.password);

      // Gera matrícula
      const matricula = await this.generateMatricula();

      // Busca o papel padrão se não for informado
      let roleId = data.roleId;
      if (!roleId) {
        const defaultRole = await prisma.role.findFirst({
          where: { name: "Empresa" },
        });
        roleId = defaultRole?.id;

        if (!roleId) {
          throw new ValidationError("Papel padrão não encontrado");
        }
      }

      // Remove formatação do CNPJ
      const cnpj = data.cnpj.replace(/\D/g, "");

      // Cria o usuário com transação para garantir consistência
      const result = await prisma.$transaction(async (tx) => {
        // Cria o usuário base
        const user = await tx.user.create({
          data: {
            email: data.email,
            password: hashedPassword,
            userType: UserType.PESSOA_JURIDICA,
            matricula,
            roleId,
            isActive: true,
          },
        });

        // Cria informações da empresa
        const companyInfo = await tx.companyInfo.create({
          data: {
            companyName: data.companyName,
            tradeName: data.tradeName,
            legalName: data.legalName,
            cnpj,
            phone: data.phone,
            website: data.website,
            userId: user.id,
          },
        });

        // Cria endereço se informado
        if (data.address) {
          await tx.address.create({
            data: {
              ...data.address,
              userId: user.id,
            },
          });
        }

        // Retorna usuário com suas informações
        return await tx.user.findUnique({
          where: { id: user.id },
          include: {
            role: true,
            companyInfo: true,
            address: true,
          },
        });
      });

      logger.info(
        `Usuário pessoa jurídica criado com sucesso: ${result?.email}`
      );

      return result;
    } catch (error) {
      logger.error("Erro ao criar usuário pessoa jurídica", error);
      throw error;
    }
  }

  /**
   * Atualiza o refresh token de um usuário
   */
  public async updateRefreshToken(
    userId: string,
    refreshToken: string | null
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });

    logger.debug(
      `Refresh token ${
        refreshToken ? "atualizado" : "removido"
      } para usuário ${userId}`
    );
  }

  /**
   * Atualiza a senha de um usuário
   */
  public async updatePassword(
    userId: string,
    newPassword: string
  ): Promise<void> {
    const hashedPassword = await HashUtils.hash(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    logger.debug(`Senha atualizada para usuário ${userId}`);
  }

  /**
   * Obtém o nome do usuário (pessoa física ou jurídica)
   */
  public getUserName(user: any): string {
    if (user.userType === UserType.PESSOA_FISICA && user.personalInfo) {
      return user.personalInfo.name;
    } else if (user.userType === UserType.PESSOA_JURIDICA && user.companyInfo) {
      return user.companyInfo.companyName;
    }

    return "Usuário";
  }

  /**
   * Obtém o documento do usuário (CPF ou CNPJ)
   */
  public getUserDocument(user: any): string {
    if (user.userType === UserType.PESSOA_FISICA && user.personalInfo) {
      return user.personalInfo.cpf;
    } else if (user.userType === UserType.PESSOA_JURIDICA && user.companyInfo) {
      return user.companyInfo.cnpj;
    }

    return "";
  }
}
