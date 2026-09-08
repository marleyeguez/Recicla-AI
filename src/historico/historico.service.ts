import { Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';

import { DatabaseService } from '../database/database.service.js';

interface HistoricoRow extends RowDataPacket {
  id: number;
  pontos: number;
  descricao: string;
  data_registro: Date;
}

@Injectable()
export class HistoricoService {
  constructor(private readonly databaseService: DatabaseService) {}

  async buscarPorUsuario(usuarioId: number) {
    const resultado = (await this.databaseService.query(
      `SELECT
        id,
        pontos,
        descricao,
        data_registro
      FROM historico_pontos
      WHERE usuario_id = ?
      ORDER BY data_registro DESC, id DESC`,
      [usuarioId],
    )) as HistoricoRow[];

    return resultado.map((item) => ({
      id: item.id,
      pontos: item.pontos,
      descricao: item.descricao,
      data_registro: item.data_registro,
      tipo: item.pontos >= 0 ? 'ganho' : 'resgate',
    }));
  }
}
