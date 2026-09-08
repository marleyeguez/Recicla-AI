import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2';

import { DatabaseService } from '../database/database.service.js';


interface QrCodeRow extends RowDataPacket {
  id: number;
  codigo: string;
  material: string;
  pontos: number;
}


interface ReciclagemRow extends RowDataPacket {
  id: number;
}


interface UsuarioPontosRow extends RowDataPacket {
  pontos: number;
}


@Injectable()
export class QrcodesService {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}


  async usarQrCode(
    usuarioId: number,
    codigoRecebido: string,
  ) {

    const codigo = codigoRecebido.trim();

    const connection =
      await this.databaseService.getConnection();


    try {

      await connection.beginTransaction();


      // 1. Procura o QR Code
      const [qrcodes] =
        await connection.execute<QrCodeRow[]>(
          `SELECT
            id,
            codigo,
            material,
            pontos
          FROM qrcodes
          WHERE codigo = ?`,
          [codigo],
        );


      if (qrcodes.length === 0) {

        throw new NotFoundException(
          'QR Code não encontrado',
        );

      }


      const qrcode = qrcodes[0];


      // 2. Verifica se ESTE usuário já utilizou ESTE QR
      const [reciclagemExistente] =
        await connection.execute<ReciclagemRow[]>(
          `SELECT id
          FROM reciclagens
          WHERE usuario_id = ?
          AND qrcode_id = ?`,
          [
            usuarioId,
            qrcode.id,
          ],
        );


      if (reciclagemExistente.length > 0) {

        throw new ConflictException(
          'Você já utilizou este QR Code',
        );

      }


      // 3. Registra a reciclagem
      await connection.execute<ResultSetHeader>(
        `INSERT INTO reciclagens (
          usuario_id,
          qrcode_id,
          pontos_ganhos
        )
        VALUES (?, ?, ?)`,
        [
          usuarioId,
          qrcode.id,
          qrcode.pontos,
        ],
      );


      // 4. Adiciona os pontos ao usuário
      await connection.execute<ResultSetHeader>(
        `UPDATE usuarios
        SET pontos = pontos + ?
        WHERE id = ?`,
        [
          qrcode.pontos,
          usuarioId,
        ],
      );


      // 5. Registra no histórico
      await connection.execute<ResultSetHeader>(
        `INSERT INTO historico_pontos (
          usuario_id,
          pontos,
          descricao
        )
        VALUES (?, ?, ?)`,
        [
          usuarioId,
          qrcode.pontos,
          `Reciclagem de ${qrcode.material}`,
        ],
      );


      // 6. Busca a pontuação atual
      const [usuario] =
        await connection.execute<UsuarioPontosRow[]>(
          `SELECT pontos
          FROM usuarios
          WHERE id = ?`,
          [usuarioId],
        );


      // 7. Confirma tudo no banco
      await connection.commit();


      return {

        mensagem:
          'QR Code utilizado com sucesso',

        reciclagem: {

          codigo: qrcode.codigo,

          material: qrcode.material,

          pontosGanhos: qrcode.pontos,

        },

        pontosAtuais:
          usuario[0]?.pontos ?? 0,

      };


    } catch (error) {

      await connection.rollback();


      // Proteção extra caso duas requisições
      // tentem registrar o mesmo QR ao mesmo tempo
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ER_DUP_ENTRY'
      ) {

        throw new ConflictException(
          'Você já utilizou este QR Code',
        );

      }


      throw error;


    } finally {

      connection.release();

    }

  }
}