import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../usuarios/guards/jwt-auth.guard.js';
import { PontosService } from './pontos.service.js';

type RequestComUsuario = Request & {
  user: {
    sub: number;
    email: string;
  };
};

@ApiTags('Pontos')
@Controller('pontos')
export class PontosController {
  constructor(private readonly pontosService: PontosService) {}

  @Get('resumo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar resumo de pontos do usuário logado' })
  resumo(@Req() request: RequestComUsuario) {
    return this.pontosService.resumo(request.user.sub);
  }
}
