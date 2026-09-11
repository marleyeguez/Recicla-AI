import { Module } from '@nestjs/common';

import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { EcopontosController } from './ecopontos.controller.js';
import { EcopontosService } from './ecopontos.service.js';

@Module({
  imports: [UsuariosModule],
  controllers: [EcopontosController],
  providers: [EcopontosService],
})
export class EcopontosModule {}
