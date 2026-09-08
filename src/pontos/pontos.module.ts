import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { PontosController } from './pontos.controller.js';
import { PontosService } from './pontos.service.js';

@Module({
  imports: [DatabaseModule, UsuariosModule],
  controllers: [PontosController],
  providers: [PontosService],
})
export class PontosModule {}
