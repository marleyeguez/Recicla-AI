import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BuscarEcopontosDto {
  @ApiProperty({
    example: -23.5505,
    description: 'Latitude atual do usuário',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    example: -46.6333,
    description: 'Longitude atual do usuário',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({
    example: 5,
    default: 5,
    minimum: 1,
    maximum: 10,
    description: 'Quantidade máxima de pontos retornados',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limite: number = 5;
}
