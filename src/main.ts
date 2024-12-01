import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as morgan from 'morgan';
import * as ngrok from '@ngrok/ngrok';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use(morgan('dev'));
  app.enableCors({
    origin: ['http://127.0.0.1:3000', 'http://localhost:3000'],
    credentials: true,
  });
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Automatically transform payload to DTO instances
      whitelist: true, // Strip properties that do not have decorators
    }),
  );

  const port = process.env.PORT ?? 5500;
  await app.listen(port);
  console.log(`Application is running on http://localhost:${port}`);

  try {
    // Establish ngrok tunnel
    const listener = await ngrok.connect({
      addr: port,
      authtoken: process.env.NGROK_AUTHTOKEN,
      subdomain: 'pika-perfect-gar',
      region: 'th',
    });
    console.log(`Ingress established at: ${listener.url()}`);
  } catch (err) {
    console.error('Error establishing ngrok tunnel:', err.message);
  }
}

bootstrap();
