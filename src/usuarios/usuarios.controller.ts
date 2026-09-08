import { Body, Controller, Post, Get, UseGuards, Req, Patch } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js'; 
import { UsuariosService } from './usuarios.service.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { LoginUsuarioDto } from './dto/login-usuario.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';

type RequestComUsuario = Request & {
  user: {
    sub: number;
    email: string;
  };
};

@ApiTags('Usuários')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post('cadastro')
  @ApiOperation({ summary: 'Cadastrar um novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário cadastrado com sucesso' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  cadastrar(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.cadastrar(createUsuarioDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Realizar login' })
  @ApiResponse({ status: 201, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'E-mail ou senha inválidos' })
  login(@Body() loginUsuarioDto: LoginUsuarioDto) {
    return this.usuariosService.login(loginUsuarioDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  perfil(
  @Req() request: RequestComUsuario,
  ) {
   return this.usuariosService.buscarPerfil(
    request.user.sub,
  );
 }

 @Patch('me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({
  summary: 'Atualizar dados do usuário logado',
})
@ApiResponse({
  status: 200,
  description: 'Perfil atualizado com sucesso',
})
@ApiResponse({
  status: 401,
  description: 'Token inválido ou não informado',
})
@ApiResponse({
  status: 409,
  description: 'E-mail já cadastrado',
})
atualizarPerfil(
  @Req() request: RequestComUsuario,
  @Body() updateUsuarioDto: UpdateUsuarioDto,
) {
  return this.usuariosService.atualizarPerfil(
    request.user.sub,
    updateUsuarioDto,
  );
}
}
