import {
  CompletionCriteria,
  Status,
  CertificateTemplate,
} from "@prisma/client";
import { SeedContext, prisma, verifyContextRequirements } from "../utils";

/**
 * Seed para criar templates de certificado
 */
export async function seedCertificateTemplates(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando templates de certificado...");

  // Verificar dependências no contexto
  verifyContextRequirements(
    context,
    ["adminUser", "courseTypes", "courseModalities"],
    "seedCertificateTemplates"
  );

  // Template básico de certificado em formato HTML/XML
  const defaultTemplateContent = `
<certificate orientation="landscape" width="800" height="600">
  <background src="{{backgroundImageUrl}}" />
  
  <header>
    <logo position="top-center" width="150" height="80" src="{{instituicaoLogo}}" />
    <title position="center" fontSize="24" fontWeight="bold" marginTop="40">CERTIFICADO DE CONCLUSÃO DE CURSO</title>
  </header>
  
  <content marginTop="50" marginLeft="50" marginRight="50" textAlign="center">
    <text fontSize="16">Certificamos que</text>
    <text fontSize="22" fontWeight="bold" marginTop="15">{{aluno_nome}}</text>
    <text fontSize="16" marginTop="15">
      concluiu com êxito o Curso de <b>{{curso_titulo}}</b> no período de {{certificado_dia_inicio}} a
      {{certificado_dia_fim}} com carga horária de {{certificado_carga_horaria}} horas, através da
      Plataforma EAD {{ead_dominio}}
    </text>
  </content>
  
  <footer position="bottom-center" marginBottom="50">
    <text fontSize="14">{{localidade}}, {{data_emissao}}</text>
    <signatures marginTop="30">
      <signature name="{{nome_responsavel}}" title="{{cargo_responsavel}}" />
      <signature name="{{nome_coordenador}}" title="Coordenador(a)" />
    </signatures>
    <text fontSize="10" marginTop="20">Código de Autenticação: {{certificateCode}}</text>
  </footer>
</certificate>
  `;

  // Campos disponíveis para uso no template
  const defaultAvailableFields = {
    instituicao: ["instituicaoLogo", "instituicaoNome", "ead_dominio"],
    aluno: ["aluno_nome", "aluno_cpf", "aluno_email"],
    curso: ["curso_titulo", "curso_categoria", "certificado_carga_horaria"],
    datas: ["certificado_dia_inicio", "certificado_dia_fim", "data_emissao"],
    certificado: ["certificateCode", "localidade"],
    responsaveis: ["nome_responsavel", "cargo_responsavel", "nome_coordenador"],
  };

  // Criar templates de certificado para diferentes casos
  const templates = [
    {
      title: "Certificado Padrão",
      description: "Template padrão para certificados de conclusão de curso",
      backgroundImageUrl: "https://example.com/templates/cert-bg-default.jpg",
      templateContent: defaultTemplateContent,
      requiredCompletion: CompletionCriteria.MODULE_COMPLETION,
      availableFields: defaultAvailableFields,
      isDefault: true,
      status: Status.ACTIVE,
      createdById: context.adminUser!.id,
    },
    {
      title: "Certificado para Cursos com Prova",
      description:
        "Template para certificados de cursos que exigem aprovação em prova",
      backgroundImageUrl: "https://example.com/templates/cert-bg-exam.jpg",
      templateContent: defaultTemplateContent.replace(
        "com carga horária de {{certificado_carga_horaria}} horas",
        "com carga horária de {{certificado_carga_horaria}} horas, obtendo aprovação com nota {{nota_final}}"
      ),
      requiredCompletion: CompletionCriteria.EXAM_ONLY,
      minGrade: 7.0, // Nota mínima 7.0
      availableFields: {
        ...defaultAvailableFields,
        avaliacao: ["nota_final", "data_prova"],
      },
      isDefault: false,
      status: Status.ACTIVE,
      createdById: context.adminUser!.id,
    },
    {
      title: "Certificado para Cursos com Estágio",
      description: "Template para certificados de cursos que exigem estágio",
      backgroundImageUrl:
        "https://example.com/templates/cert-bg-internship.jpg",
      templateContent: defaultTemplateContent.replace(
        "com carga horária de {{certificado_carga_horaria}} horas",
        "com carga horária de {{certificado_carga_horaria}} horas teóricas e {{horas_estagio}} horas de estágio"
      ),
      requiredCompletion: CompletionCriteria.INTERNSHIP_ONLY,
      availableFields: {
        ...defaultAvailableFields,
        estagio: ["horas_estagio", "local_estagio", "supervisor_estagio"],
      },
      isDefault: false,
      status: Status.ACTIVE,
      createdById: context.adminUser!.id,
    },
    {
      title: "Certificado Completo (Prova e Estágio)",
      description:
        "Template para certificados de cursos que exigem prova e estágio",
      backgroundImageUrl: "https://example.com/templates/cert-bg-complete.jpg",
      templateContent: defaultTemplateContent.replace(
        "com carga horária de {{certificado_carga_horaria}} horas",
        "com carga horária de {{certificado_carga_horaria}} horas teóricas e {{horas_estagio}} horas de estágio, obtendo aprovação com nota {{nota_final}}"
      ),
      requiredCompletion: CompletionCriteria.EXAM_AND_INTERNSHIP,
      minGrade: 7.0,
      availableFields: {
        ...defaultAvailableFields,
        avaliacao: ["nota_final", "data_prova"],
        estagio: ["horas_estagio", "local_estagio", "supervisor_estagio"],
      },
      isDefault: false,
      status: Status.ACTIVE,
      createdById: context.adminUser!.id,
    },
    {
      title: "Certificado para Cursos Online",
      description:
        "Template para certificados de cursos realizados totalmente online",
      backgroundImageUrl: "https://example.com/templates/cert-bg-online.jpg",
      templateContent: defaultTemplateContent,
      requiredCompletion: CompletionCriteria.MODULE_COMPLETION,
      availableFields: defaultAvailableFields,
      isDefault: false,
      status: Status.ACTIVE,
      createdById: context.adminUser!.id,
    },
  ];

  // Criar os templates
  const createdTemplates: CertificateTemplate[] = [];

  for (const template of templates) {
    try {
      // Primeiro verificar se já existe um template com este título
      const existingTemplate = await prisma.certificateTemplate.findFirst({
        where: { title: template.title },
      });

      let createdTemplate;

      if (existingTemplate) {
        // Atualizar o existente
        createdTemplate = await prisma.certificateTemplate.update({
          where: { id: existingTemplate.id },
          data: template,
        });
      } else {
        // Criar novo
        createdTemplate = await prisma.certificateTemplate.create({
          data: template,
        });
      }

      console.log(
        `Template de certificado ${
          existingTemplate ? "atualizado" : "criado"
        }: ${createdTemplate.title}`
      );
      createdTemplates.push(createdTemplate);
    } catch (error) {
      console.error(
        `Erro ao criar template de certificado ${template.title}:`,
        error
      );
    }
  }

  // Associar os templates a tipos de curso e modalidades específicas
  await associateTemplatesToCourseTypes(createdTemplates, context);

  return {
    ...context,
    certificateTemplates: createdTemplates,
  };
}

/**
 * Associa templates a tipos e modalidades de curso
 */
async function associateTemplatesToCourseTypes(
  templates: CertificateTemplate[],
  context: SeedContext
) {
  if (!context.courseTypes || !context.courseModalities) {
    console.warn("Tipos de curso ou modalidades não encontrados no contexto");
    return;
  }

  // Mapear tipos e modalidades por nome
  const courseTypeMap = context.courseTypes.reduce((map, type) => {
    map[type.name] = type;
    return map;
  }, {} as Record<string, (typeof context.courseTypes)[0]>);

  const modalityMap = context.courseModalities.reduce((map, modality) => {
    map[modality.name] = modality;
    return map;
  }, {} as Record<string, (typeof context.courseModalities)[0]>);

  // Associações de templates para tipos/modalidades específicos
  const associations = [
    {
      templateTitle: "Certificado Padrão",
      courseTypeName: "GRATUITO",
      modalityName: null, // Aplicável a qualquer modalidade
    },
    {
      templateTitle: "Certificado para Cursos com Prova",
      courseTypeName: "PAGO",
      modalityName: "ONLINE",
    },
    {
      templateTitle: "Certificado para Cursos com Estágio",
      courseTypeName: "CERTIFICAÇÃO",
      modalityName: "PRESENCIAL",
    },
    {
      templateTitle: "Certificado Completo (Prova e Estágio)",
      courseTypeName: "CERTIFICAÇÃO",
      modalityName: "HIBRIDO",
    },
    {
      templateTitle: "Certificado para Cursos Online",
      courseTypeName: "PAGO",
      modalityName: "ONLINE",
    },
  ];

  // Criar as associações
  for (const assoc of associations) {
    // Encontrar o template pelo título
    const template = templates.find((t) => t.title === assoc.templateTitle);
    if (!template) {
      console.warn(`Template "${assoc.templateTitle}" não encontrado`);
      continue;
    }

    // Encontrar o tipo de curso pelo nome
    const courseType = courseTypeMap[assoc.courseTypeName];
    if (!courseType) {
      console.warn(`Tipo de curso "${assoc.courseTypeName}" não encontrado`);
      continue;
    }

    // Encontrar a modalidade pelo nome (pode ser null)
    const modality = assoc.modalityName
      ? modalityMap[assoc.modalityName]
      : null;
    if (assoc.modalityName && !modality) {
      console.warn(`Modalidade "${assoc.modalityName}" não encontrada`);
      continue;
    }

    try {
      // Primeira verificar se a associação já existe
      const existingAssociation =
        await prisma.certificateTemplateCourseType.findFirst({
          where: {
            templateId: template.id,
            courseTypeId: courseType.id,
            modalityId: modality?.id || null,
          },
        });

      if (existingAssociation) {
        console.log(
          `Associação já existe: ${template.title} -> ${courseType.name}${
            modality ? ` (${modality.name})` : ""
          }`
        );
        continue;
      }

      // Criar a associação
      await prisma.certificateTemplateCourseType.create({
        data: {
          templateId: template.id,
          courseTypeId: courseType.id,
          modalityId: modality?.id || null,
        },
      });

      console.log(
        `Associação criada: ${template.title} -> ${courseType.name}${
          modality ? ` (${modality.name})` : ""
        }`
      );
    } catch (error) {
      console.error(`Erro ao criar associação para ${template.title}:`, error);
    }
  }
}
