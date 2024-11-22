import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  const allowedOrigins = ['http://127.0.0.1:3000', 'http://localhost:3000'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Automatically transform payload to DTO instances
      whitelist: true, // Strip properties that do not have decorators
    }),
  );

  await app.listen(process.env.PORT ?? 5500);
}
bootstrap();
