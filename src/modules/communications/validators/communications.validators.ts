import Joi from "joi";

/**
 * Esquema de validação para envio de e-mail
 */
export const sendEmailSchema = Joi.object({
  subject: Joi.string().required().messages({
    "string.empty": "O assunto é obrigatório",
    "any.required": "O assunto é obrigatório",
  }),

  htmlContent: Joi.string().allow(null, "").messages({
    "string.base": "O conteúdo HTML deve ser uma string",
  }),

  textContent: Joi.string().allow(null, "").messages({
    "string.base": "O conteúdo texto deve ser uma string",
  }),

  to: Joi.alternatives()
    .try(
      Joi.string().email().messages({
        "string.email": "E-mail do destinatário inválido",
      }),
      Joi.array().items(
        Joi.object({
          email: Joi.string().email().required().messages({
            "string.email": "E-mail do destinatário inválido",
            "any.required": "E-mail do destinatário é obrigatório",
          }),
          name: Joi.string().allow(null, ""),
        })
      )
    )
    .required()
    .messages({
      "any.required": "O destinatário é obrigatório",
    }),

  toName: Joi.string().allow(null, ""),

  senderEmail: Joi.string().email().allow(null).messages({
    "string.email": "E-mail do remetente inválido",
  }),

  senderName: Joi.string().allow(null, ""),

  replyTo: Joi.string().email().allow(null, "").messages({
    "string.email": "E-mail de resposta inválido",
  }),

  replyToName: Joi.string().allow(null, ""),

  cc: Joi.alternatives()
    .try(
      Joi.string().email().messages({
        "string.email": "E-mail em cópia inválido",
      }),
      Joi.array().items(
        Joi.object({
          email: Joi.string().email().required().messages({
            "string.email": "E-mail em cópia inválido",
            "any.required": "E-mail em cópia é obrigatório",
          }),
          name: Joi.string().allow(null, ""),
        })
      )
    )
    .allow(null),

  bcc: Joi.alternatives()
    .try(
      Joi.string().email().messages({
        "string.email": "E-mail em cópia oculta inválido",
      }),
      Joi.array().items(
        Joi.object({
          email: Joi.string().email().required().messages({
            "string.email": "E-mail em cópia oculta inválido",
            "any.required": "E-mail em cópia oculta é obrigatório",
          }),
          name: Joi.string().allow(null, ""),
        })
      )
    )
    .allow(null),

  params: Joi.object().pattern(Joi.string(), Joi.any()).allow(null),

  attachments: Joi.array()
    .items(
      Joi.object({
        content: Joi.string().required().messages({
          "string.empty": "O conteúdo do anexo é obrigatório",
          "any.required": "O conteúdo do anexo é obrigatório",
        }),
        name: Joi.string().required().messages({
          "string.empty": "O nome do anexo é obrigatório",
          "any.required": "O nome do anexo é obrigatório",
        }),
        contentType: Joi.string().allow(null, ""),
      })
    )
    .allow(null),

  headers: Joi.object().pattern(Joi.string(), Joi.string()).allow(null),
})
  .or("htmlContent", "textContent")
  .messages({
    "object.missing": "É necessário fornecer conteúdo HTML ou texto",
  });

/**
 * Esquema de validação para envio de e-mail com template
 */
export const sendTemplateEmailSchema = Joi.object({
  templateId: Joi.number().integer().positive().required().messages({
    "number.base": "ID do template deve ser um número",
    "number.integer": "ID do template deve ser um número inteiro",
    "number.positive": "ID do template deve ser um número positivo",
    "any.required": "ID do template é obrigatório",
  }),

  to: Joi.alternatives()
    .try(
      Joi.string().email().messages({
        "string.email": "E-mail do destinatário inválido",
      }),
      Joi.array().items(
        Joi.object({
          email: Joi.string().email().required().messages({
            "string.email": "E-mail do destinatário inválido",
            "any.required": "E-mail do destinatário é obrigatório",
          }),
          name: Joi.string().allow(null, ""),
        })
      )
    )
    .required()
    .messages({
      "any.required": "O destinatário é obrigatório",
    }),

  params: Joi.object().pattern(Joi.string(), Joi.any()).required().messages({
    "any.required": "Os parâmetros do template são obrigatórios",
  }),

  options: Joi.object({
    toName: Joi.string().allow(null, ""),
    senderEmail: Joi.string().email().allow(null, "").messages({
      "string.email": "E-mail do remetente inválido",
    }),
    senderName: Joi.string().allow(null, ""),
    replyTo: Joi.string().email().allow(null, "").messages({
      "string.email": "E-mail de resposta inválido",
    }),
    replyToName: Joi.string().allow(null, ""),
    cc: Joi.alternatives()
      .try(
        Joi.string().email(),
        Joi.array().items(
          Joi.object({
            email: Joi.string().email().required(),
            name: Joi.string().allow(null, ""),
          })
        )
      )
      .allow(null),
    bcc: Joi.alternatives()
      .try(
        Joi.string().email(),
        Joi.array().items(
          Joi.object({
            email: Joi.string().email().required(),
            name: Joi.string().allow(null, ""),
          })
        )
      )
      .allow(null),
    attachments: Joi.array()
      .items(
        Joi.object({
          content: Joi.string().required(),
          name: Joi.string().required(),
          contentType: Joi.string().allow(null, ""),
        })
      )
      .allow(null),
    headers: Joi.object().pattern(Joi.string(), Joi.string()).allow(null),
  }).allow(null),
});

/**
 * Esquema de validação para envio de SMS
 */
export const sendSmsSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\+[0-9]{10,15}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Número de telefone deve estar no formato internacional (ex: +5511912345678)",
      "string.empty": "Número de telefone é obrigatório",
      "any.required": "Número de telefone é obrigatório",
    }),

  content: Joi.string().max(160).required().messages({
    "string.max": "Conteúdo do SMS não pode exceder 160 caracteres",
    "string.empty": "Conteúdo do SMS é obrigatório",
    "any.required": "Conteúdo do SMS é obrigatório",
  }),

  sender: Joi.string().max(11).allow(null, "").messages({
    "string.max": "Nome do remetente não pode exceder 11 caracteres",
  }),

  type: Joi.string().valid("marketing", "transactional").allow(null),

  tag: Joi.string().allow(null, ""),

  webUrl: Joi.string().uri().allow(null, "").messages({
    "string.uri": "URL deve ser válida",
  }),
});

/**
 * Esquema de validação para envio de SMS com template
 */
export const sendTemplateSmsSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\+[0-9]{10,15}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Número de telefone deve estar no formato internacional (ex: +5511912345678)",
      "string.empty": "Número de telefone é obrigatório",
      "any.required": "Número de telefone é obrigatório",
    }),

  templateContent: Joi.string().required().messages({
    "string.empty": "Conteúdo do template é obrigatório",
    "any.required": "Conteúdo do template é obrigatório",
  }),

  params: Joi.object().pattern(Joi.string(), Joi.string()).required().messages({
    "any.required": "Os parâmetros do template são obrigatórios",
  }),

  options: Joi.object({
    sender: Joi.string().max(11).allow(null, ""),
    type: Joi.string().valid("marketing", "transactional").allow(null),
    tag: Joi.string().allow(null, ""),
    webUrl: Joi.string().uri().allow(null, ""),
  }).allow(null),
});

/**
 * Esquema de validação para envio de WhatsApp
 */
export const sendWhatsAppSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\+[0-9]{10,15}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Número de telefone deve estar no formato internacional (ex: +5511912345678)",
      "string.empty": "Número de telefone é obrigatório",
      "any.required": "Número de telefone é obrigatório",
    }),

  content: Joi.string().allow(null, ""),

  sender: Joi.string().allow(null, ""),

  templateId: Joi.number().integer().positive().allow(null),

  params: Joi.object().pattern(Joi.string(), Joi.string()).allow(null),
})
  .xor("content", "templateId")
  .messages({
    "object.xor":
      "Deve fornecer conteúdo direto OU ID do template, mas não ambos",
  });

/**
 * Esquema de validação para envio de WhatsApp com template
 */
export const sendWhatsAppTemplateSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\+[0-9]{10,15}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Número de telefone deve estar no formato internacional (ex: +5511912345678)",
      "string.empty": "Número de telefone é obrigatório",
      "any.required": "Número de telefone é obrigatório",
    }),

  templateId: Joi.number().integer().positive().required().messages({
    "number.base": "ID do template deve ser um número",
    "number.integer": "ID do template deve ser um número inteiro",
    "number.positive": "ID do template deve ser um número positivo",
    "any.required": "ID do template é obrigatório",
  }),

  params: Joi.object().pattern(Joi.string(), Joi.string()).required().messages({
    "any.required": "Os parâmetros do template são obrigatórios",
  }),

  options: Joi.object({
    sender: Joi.string().allow(null, ""),
  }).allow(null),
});
