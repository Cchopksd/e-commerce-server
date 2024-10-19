import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Automatically transform payload to DTO instances
      whitelist: true, // Strip properties that do not have decorators
    }),
  );


  await app.listen(process.env.PORT ?? 5500);
}
bootstrap();
