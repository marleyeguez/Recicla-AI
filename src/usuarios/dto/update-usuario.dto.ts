import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @ApiPropertyOptional({ example: 'João Silva' })
  nome?: string;

  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional({ example: 'joao@email.com' })
  email?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: true })
  notificacoes?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: true })
  localizacao?: boolean;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Foto de perfil em Data URL. String vazia remove a foto.',
    example: 'data:image/jpeg;base64,...',
  })
  foto?: string;
}
