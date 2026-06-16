import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerEnabled =
    (process.env.SWAGGER_ENABLED ??
      (process.env.NODE_ENV === 'production' ? '0' : '1')) === '1';

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(process.env.SWAGGER_TITLE ?? 'Zemledel PRO API')
      .setDescription(
        process.env.SWAGGER_DESCRIPTION ??
          'API documentation for Zemledel PRO backend',
      )
      .setVersion(process.env.SWAGGER_VERSION ?? '0.0.1')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          in: 'header',
        },
        'bearer',
      )
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, swaggerDocument, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(process.env.PORT ?? 3003);
}
void bootstrap();
