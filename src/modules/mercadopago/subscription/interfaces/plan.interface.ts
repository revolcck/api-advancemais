import {
  CreatePlanDTO,
  UpdatePlanDTO,
  PlanResponseDTO,
  PlanFilterDTO,
} from "../dto/plan.dto";

/**
 * Interface para o serviço de planos de assinatura
 */
export interface IPlanService {
  /**
   * Criar um novo plano de assinatura
   * @param data Dados do plano
   * @param userId ID do usuário administrador que está criando o plano
   */
  createPlan(data: CreatePlanDTO, userId: string): Promise<PlanResponseDTO>;

  /**
   * Atualizar um plano de assinatura existente
   * @param id ID do plano
   * @param data Dados para atualização
   * @param userId ID do usuário administrador que está atualizando
   */
  updatePlan(
    id: string,
    data: UpdatePlanDTO,
    userId: string
  ): Promise<PlanResponseDTO>;

  /**
   * Ativar ou desativar um plano de assinatura
   * @param id ID do plano
   * @param active Status de ativação
   * @param userId ID do usuário administrador
   */
  togglePlanStatus(
    id: string,
    active: boolean,
    userId: string
  ): Promise<PlanResponseDTO>;

  /**
   * Obter um plano pelo ID
   * @param id ID do plano
   */
  getPlanById(id: string): Promise<PlanResponseDTO>;

  /**
   * Listar todos os planos de assinatura com filtros opcionais
   * @param filter Filtros para a busca
   * @param includeInactive Incluir planos inativos
   */
  listPlans(
    filter?: PlanFilterDTO,
    includeInactive?: boolean
  ): Promise<PlanResponseDTO[]>;

  /**
   * Verificar se um plano está ativo
   * @param planId ID do plano
   */
  isPlanActive(planId: string): Promise<boolean>;
}
