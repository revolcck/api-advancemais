import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Limpar dados existentes nas tabelas (cuidado em produção)
  // await prisma.role.deleteMany();

  // Array de roles conforme especificado
  const roles = [
    {
      name: "Professor",
      level: 1,
      status: 1,
      description: "Professores e instrutores",
    },
    { name: "Aluno", level: 2, status: 1, description: "Alunos do sistema" },
    { name: "Empresa", level: 3, status: 1, description: "Empresas parceiras" },
    {
      name: "Administrador",
      level: 4,
      status: 1,
      description: "Administradores do sistema",
    },
    {
      name: "Recrutadores",
      level: 5,
      status: 1,
      description: "Profissionais de recrutamento",
    },
    {
      name: "Setor Pedagógico",
      level: 6,
      status: 1,
      description: "Equipe pedagógica",
    },
    {
      name: "Recursos Humanos",
      level: 7,
      status: 1,
      description: "Equipe de RH",
    },
    {
      name: "Super Administrador",
      level: 8,
      status: 1,
      description: "Acesso total ao sistema",
    },
  ];

  console.log("Iniciando seed...");

  // Inserir roles no banco de dados
  for (const role of roles) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: role,
      create: role,
    });
    console.log(`Role criada: ${createdRole.name}`);
  }

  console.log("Seed finalizado com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
