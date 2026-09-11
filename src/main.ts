import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Front e API ficam no mesmo domínio. Railway entrega HTTPS na borda.
  // O host 0.0.0.0 é necessário para a aplicação aceitar tráfego do deploy.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API Recicla AI')
    .setDescription('API do projeto Recicla AI')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api_recicla_ai', app, document);

  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');

  console.log(`Recicla AI rodando na porta ${port}`);
}

bootstrap();
