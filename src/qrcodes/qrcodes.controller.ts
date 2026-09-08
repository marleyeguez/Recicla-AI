import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../usuarios/guards/jwt-auth.guard.js';
import { QrcodesService } from './qrcodes.service.js';
import { UsarQrCodeDto } from './dto/usar-qrcode.dto.js';

type RequestComUsuario = Request & {
  user: {
    sub: number;
    email: string;
  };
};

@ApiTags('QR Codes')
@Controller('qrcodes')
export class QrcodesController {
  constructor(private readonly qrcodesService: QrcodesService) {}

  @Post('usar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validar e utilizar um QR Code' })
  @ApiResponse({ status: 201, description: 'QR Code utilizado e pontos adicionados' })
  @ApiResponse({ status: 404, description: 'QR Code não encontrado' })
  @ApiResponse({ status: 409, description: 'QR Code já utilizado' })
  usar(
    @Req() request: RequestComUsuario,
    @Body() usarQrCodeDto: UsarQrCodeDto,
  ) {
    return this.qrcodesService.usarQrCode(
      request.user.sub,
      usarQrCodeDto.codigo,
    );
  }
}
