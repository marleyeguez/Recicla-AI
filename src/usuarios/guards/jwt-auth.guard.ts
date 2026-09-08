import {  CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

type JwtPayload = {
  sub: number;
  email: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();

    const token = this.extrairToken(request);

    if (!token) {
      throw new UnauthorizedException('Token não informado');
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<JwtPayload>(token);

      request.user = payload;

      return true;
    } catch {
      throw new UnauthorizedException(
        'Token inválido ou expirado',
      );
    }
  }

  private extrairToken(
    request: Request,
  ): string | undefined {
    const authorization =
      request.headers.authorization;

    if (!authorization) {
      return undefined;
    }

    const [tipo, token] =
      authorization.split(' ');

    if (tipo !== 'Bearer') {
      return undefined;
    }

    return token;
  }
}