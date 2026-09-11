import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { DatabaseModule } from './database/database.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { QrcodesModule } from './qrcodes/qrcodes.module.js';
import { HistoricoModule } from './historico/historico.module.js';
import { PontosModule } from './pontos/pontos.module.js';
import { EcopontosModule } from './ecopontos/ecopontos.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'reciclaAI_frontend'),
    }),

    DatabaseModule,
    UsuariosModule,
    QrcodesModule,
    HistoricoModule,
    PontosModule,
    EcopontosModule,
  ],
})
export class AppModule {}
