/**
 * Controlador de autenticação
 * Lida com as requisições HTTP relacionadas a autenticação de usuários
 */

import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import {
  LoginRequestDto,
  RefreshTokenRequestDto,
  RegisterRequestDto,
  ChangePasswordRequestDto,
} from "../dto/auth.dto";

/**
 * Controlador que implementa os endpoints de autenticação
 */
export class AuthController {
  /**
   * Instância do serviço de autenticação
   */
  private authService: AuthService;

  /**
   * Inicializa o controlador com uma instância do serviço de autenticação
   */
  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Realiza login do usuário
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    const loginData: LoginRequestDto = req.body;
    const result = await this.authService.login(loginData);

    res.status(200).json({
      status: "success",
      data: result,
    });
  };

  /**
   * Registra um novo usuário
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   */
  public register = async (req: Request, res: Response): Promise<void> => {
    const registerData: RegisterRequestDto = req.body;
    const result = await this.authService.register(registerData);

    res.status(201).json({
      status: "success",
      data: result,
    });
  };

  /**
   * Atualiza o token de acesso usando o token de refresh
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   */
  public refreshToken = async (req: Request, res: Response): Promise<void> => {
    const refreshData: RefreshTokenRequestDto = req.body;
    const result = await this.authService.refreshToken(refreshData);

    res.status(200).json({
      status: "success",
      data: result,
    });
  };

  /**
   * Realiza o logout do usuário
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   */
  public logout = async (req: Request, res: Response): Promise<void> => {
    // Usuário já foi validado pelo middleware authenticate
    const userId = req.user!.id;

    // Obtém o token de refresh da requisição
    const refreshToken = req.body.refreshToken;

    const result = await this.authService.logout(userId, refreshToken);

    res.status(200).json({
      status: "success",
      data: result,
    });
  };

  /**
   * Altera a senha do usuário
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   */
  public changePassword = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    // Usuário já foi validado pelo middleware authenticate
    const userId = req.user!.id;

    const passwordData: ChangePasswordRequestDto = req.body;
    const result = await this.authService.changePassword(userId, passwordData);

    res.status(200).json({
      status: "success",
      data: result,
    });
  };
}
