import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUsuarioDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'João Silva', description: 'Nome do usuário' })
  nome: string;

  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ example: 'joao@email.com', description: 'E-mail do usuário' })
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @ApiProperty({ example: '123456', description: 'Senha com no mínimo 6 caracteres' })
  senha: string;
}
