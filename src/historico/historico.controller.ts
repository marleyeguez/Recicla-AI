import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../usuarios/guards/jwt-auth.guard.js';
import { HistoricoService } from './historico.service.js';

type RequestComUsuario = Request & {
  user: {
    sub: number;
    email: string;
  };
};

@ApiTags('Histórico')
@Controller('historico')
export class HistoricoController {
  constructor(private readonly historicoService: HistoricoService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar histórico de pontos do usuário logado' })
  buscar(@Req() request: RequestComUsuario) {
    return this.historicoService.buscarPorUsuario(request.user.sub);
  }
}
