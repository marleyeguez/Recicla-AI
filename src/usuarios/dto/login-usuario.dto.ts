import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginUsuarioDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ example: 'joao@email.com', description: 'E-mail cadastrado' })
  email: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: '123456', description: 'Senha do usuário' })
  senha: string;
}
