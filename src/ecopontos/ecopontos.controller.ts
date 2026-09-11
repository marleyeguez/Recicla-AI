import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../usuarios/guards/jwt-auth.guard.js';
import { BuscarEcopontosDto } from './dto/buscar-ecopontos.dto.js';
import { EcopontosService } from './ecopontos.service.js';

@ApiTags('Ecopontos')
@Controller('ecopontos')
export class EcopontosController {
  constructor(private readonly ecopontosService: EcopontosService) {}

  @Get('proximos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Buscar pontos de coleta próximos da localização atual do usuário',
  })
  @ApiResponse({
    status: 200,
    description: 'Pontos de coleta encontrados e ordenados por distância',
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido ou não informado',
  })
  @ApiResponse({
    status: 503,
    description: 'Serviço público de localização indisponível',
  })
  buscarProximos(@Query() query: BuscarEcopontosDto) {
    return this.ecopontosService.buscarProximos(
      query.latitude,
      query.longitude,
      query.limite,
    );
  }
}
