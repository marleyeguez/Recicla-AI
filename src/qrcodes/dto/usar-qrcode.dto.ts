import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UsarQrCodeDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'QR001',
    description: 'Código gerado pela máquina de reciclagem parceira',
  })
  codigo: string;
}
