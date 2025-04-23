/**
 * Definições dos tipos de erro do Prisma
 * Estas interfaces servem como substitutos para as classes de erro que deveriam vir do @prisma/client
 */

export class PrismaClientKnownRequestError extends Error {
  code: string;
  meta?: Record<string, any>;
  clientVersion?: string;

  constructor(
    message: string,
    {
      code,
      meta,
      clientVersion,
    }: { code: string; meta?: Record<string, any>; clientVersion?: string }
  ) {
    super(message);
    this.name = "PrismaClientKnownRequestError";
    this.code = code;
    this.meta = meta;
    this.clientVersion = clientVersion;
  }
}

export class PrismaClientValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrismaClientValidationError";
  }
}
