import { Injectable, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';

import { DatabaseService } from '../database/database.service.js';

interface PontosRow extends RowDataPacket {
  pontos: number;
}

interface ContagemRow extends RowDataPacket {
  total: number;
}

interface SomaRow extends RowDataPacket {
  total: number | string | null;
}

@Injectable()
export class PontosService {
  constructor(private readonly databaseService: DatabaseService) {}

  async resumo(usuarioId: number) {
    const usuario = (await this.databaseService.query(
      `SELECT pontos
       FROM usuarios
       WHERE id = ?`,
      [usuarioId],
    )) as PontosRow[];

    if (usuario.length === 0) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const reciclagens = (await this.databaseService.query(
      `SELECT COUNT(*) AS total
       FROM reciclagens
       WHERE usuario_id = ?`,
      [usuarioId],
    )) as ContagemRow[];

    const pontosMes = (await this.databaseService.query(
      `SELECT COALESCE(SUM(pontos), 0) AS total
       FROM historico_pontos
       WHERE usuario_id = ?
         AND pontos > 0
         AND YEAR(data_registro) = YEAR(CURRENT_DATE())
         AND MONTH(data_registro) = MONTH(CURRENT_DATE())`,
      [usuarioId],
    )) as SomaRow[];

    const resgates = (await this.databaseService.query(
      `SELECT COUNT(*) AS total
       FROM historico_pontos
       WHERE usuario_id = ?
         AND pontos < 0`,
      [usuarioId],
    )) as ContagemRow[];

    return {
      pontosAtuais: Number(usuario[0].pontos),
      reciclagensRealizadas: Number(reciclagens[0]?.total ?? 0),
      pontosGanhosMes: Number(pontosMes[0]?.total ?? 0),
      resgatesRealizados: Number(resgates[0]?.total ?? 0),
    };
  }
}
