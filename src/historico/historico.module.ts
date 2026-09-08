import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { HistoricoController } from './historico.controller.js';
import { HistoricoService } from './historico.service.js';

@Module({
  imports: [DatabaseModule, UsuariosModule],
  controllers: [HistoricoController],
  providers: [HistoricoService],
})
export class HistoricoModule {}
