import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { compare, hash } from 'bcryptjs';

import { DatabaseService } from '../database/database.service.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { LoginUsuarioDto } from './dto/login-usuario.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';

export interface UsuarioRow extends RowDataPacket {
  id: number;
  nome: string;
  email: string;
  senha: string;
  foto: string | null;
  pontos: number;
  notificacoes: number | boolean;
  localizacao: number | boolean;
  criado_em: Date;
}

@Injectable()
export class UsuariosService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async cadastrar(createUsuarioDto: CreateUsuarioDto) {
    const nome = createUsuarioDto.nome.trim();
    const email = createUsuarioDto.email.trim().toLowerCase();

    const usuarioExistente = (await this.databaseService.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email],
    )) as RowDataPacket[];

    if (usuarioExistente.length > 0) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }

    const senhaCriptografada = await hash(createUsuarioDto.senha, 10);

    const resultado = (await this.databaseService.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      [nome, email, senhaCriptografada],
    )) as ResultSetHeader;

    const usuarioCriado = (await this.databaseService.query(
      `SELECT
        id,
        nome,
        email,
        foto,
        pontos,
        notificacoes,
        localizacao,
        criado_em
      FROM usuarios
      WHERE id = ?`,
      [resultado.insertId],
    )) as UsuarioRow[];

    return {
      mensagem: 'Usuário cadastrado com sucesso',
      usuario: usuarioCriado[0],
    };
  }

  async login(loginUsuarioDto: LoginUsuarioDto) {
    const email = loginUsuarioDto.email.trim().toLowerCase();

    const resultado = (await this.databaseService.query(
      `SELECT
        id,
        nome,
        email,
        senha,
        foto,
        pontos,
        notificacoes,
        localizacao,
        criado_em
      FROM usuarios
      WHERE email = ?`,
      [email],
    )) as UsuarioRow[];

    if (resultado.length === 0) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const usuario = resultado[0];
    const senhaValida = await compare(loginUsuarioDto.senha, usuario.senha);

    if (!senhaValida) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const token = await this.jwtService.signAsync({
      sub: usuario.id,
      email: usuario.email,
    });

    return {
      mensagem: 'Login realizado com sucesso',
      token,
      usuario: this.usuarioPublico(usuario),
    };
  }

  async buscarPerfil(usuarioId: number) {
    const resultado = (await this.databaseService.query(
      `SELECT
        id,
        nome,
        email,
        foto,
        pontos,
        notificacoes,
        localizacao,
        criado_em
      FROM usuarios
      WHERE id = ?`,
      [usuarioId],
    )) as UsuarioRow[];

    if (resultado.length === 0) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.usuarioPublico(resultado[0]);
  }

  async atualizarPerfil(
    usuarioId: number,
    updateUsuarioDto: UpdateUsuarioDto,
  ) {
    const resultadoUsuario = (await this.databaseService.query(
      `SELECT
        id,
        nome,
        email,
        foto,
        pontos,
        notificacoes,
        localizacao,
        criado_em
      FROM usuarios
      WHERE id = ?`,
      [usuarioId],
    )) as UsuarioRow[];

    if (resultadoUsuario.length === 0) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const usuarioAtual = resultadoUsuario[0];

    const nome = updateUsuarioDto.nome?.trim() ?? usuarioAtual.nome;
    const email = updateUsuarioDto.email?.trim().toLowerCase() ?? usuarioAtual.email;
    const notificacoes = updateUsuarioDto.notificacoes ?? Boolean(usuarioAtual.notificacoes);
    const localizacao = updateUsuarioDto.localizacao ?? Boolean(usuarioAtual.localizacao);
    const foto = updateUsuarioDto.foto !== undefined
      ? updateUsuarioDto.foto
      : usuarioAtual.foto;

    if (email !== usuarioAtual.email) {
      const emailExistente = (await this.databaseService.query(
        `SELECT id
        FROM usuarios
        WHERE email = ?
        AND id != ?`,
        [email, usuarioId],
      )) as RowDataPacket[];

      if (emailExistente.length > 0) {
        throw new ConflictException('Este e-mail já está cadastrado');
      }
    }

    await this.databaseService.query(
      `UPDATE usuarios
      SET
        nome = ?,
        email = ?,
        foto = ?,
        notificacoes = ?,
        localizacao = ?
      WHERE id = ?`,
      [
        nome,
        email,
        foto,
        notificacoes,
        localizacao,
        usuarioId,
      ],
    );

    const usuarioAtualizado = (await this.databaseService.query(
      `SELECT
        id,
        nome,
        email,
        foto,
        pontos,
        notificacoes,
        localizacao,
        criado_em
      FROM usuarios
      WHERE id = ?`,
      [usuarioId],
    )) as UsuarioRow[];

    return {
      mensagem: 'Perfil atualizado com sucesso',
      usuario: this.usuarioPublico(usuarioAtualizado[0]),
    };
  }

  private usuarioPublico(usuario: UsuarioRow) {
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      foto: usuario.foto || '',
      pontos: usuario.pontos,
      notificacoes: Boolean(usuario.notificacoes),
      localizacao: Boolean(usuario.localizacao),
      criado_em: usuario.criado_em,
    };
  }
}
