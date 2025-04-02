/**
 * Utilitário para logs coloridos e formatados
 */
export const logger = {
  /**
   * Log informativo
   * @param message Mensagem principal
   * @param data Dados adicionais (opcional)
   */
  info: (message: string, data?: any) => {
    console.log(`\x1b[36m[INFO]\x1b[0m ${message}`);
    if (data) {
      console.log(data);
    }
  },

  /**
   * Log de sucesso
   * @param message Mensagem principal
   * @param data Dados adicionais (opcional)
   */
  success: (message: string, data?: any) => {
    console.log(`\x1b[32m[SUCESSO]\x1b[0m ${message}`);
    if (data) {
      console.log(data);
    }
  },

  /**
   * Log de aviso
   * @param message Mensagem principal
   * @param data Dados adicionais (opcional)
   */
  warn: (message: string, data?: any) => {
    console.log(`\x1b[33m[AVISO]\x1b[0m ${message}`);
    if (data) {
      console.log(data);
    }
  },

  /**
   * Log de erro
   * @param message Mensagem principal
   * @param error Erro ou dados adicionais (opcional)
   */
  error: (message: string, error?: any) => {
    console.error(`\x1b[31m[ERRO]\x1b[0m ${message}`);
    if (error) {
      if (error instanceof Error) {
        console.error(`${error.name}: ${error.message}`);
        console.error(error.stack);
      } else {
        console.error(error);
      }
    }
  },

  /**
   * Log para início de seção
   * @param title Título da seção
   */
  section: (title: string) => {
    console.log(`\n\x1b[35m======== ${title} ========\x1b[0m\n`);
  },

  /**
   * Log para subseção
   * @param title Título da subseção
   */
  subSection: (title: string) => {
    console.log(`\n\x1b[34m---- ${title} ----\x1b[0m\n`);
  },

  /**
   * Log para entidade criada
   * @param entityType Tipo de entidade
   * @param identifier Identificador da entidade
   */
  entity: (entityType: string, identifier: string) => {
    console.log(`\x1b[32m[CRIADO]\x1b[0m ${entityType}: ${identifier}`);
  },

  /**
   * Log para progresso
   * @param current Valor atual
   * @param total Total
   * @param prefix Prefixo (opcional)
   */
  progress: (current: number, total: number, prefix = "Progresso") => {
    const percentage = Math.floor((current / total) * 100);
    console.log(
      `\x1b[36m[${prefix}]\x1b[0m ${current}/${total} (${percentage}%)`
    );
  },
};
