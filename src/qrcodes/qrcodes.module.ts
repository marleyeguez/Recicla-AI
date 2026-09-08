import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { QrcodesController } from './qrcodes.controller.js';
import { QrcodesService } from './qrcodes.service.js';

@Module({
  imports: [DatabaseModule, UsuariosModule],
  controllers: [QrcodesController],
  providers: [QrcodesService],
})
export class QrcodesModule {}
