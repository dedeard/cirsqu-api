import { NestFactory } from '@nestjs/core';
import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationError } from 'class-validator';

// Create custom exception factory for validation pipe
function exceptionFactory(errors: ValidationError[]) {
  const firstError = errors[0];
  return new UnprocessableEntityException(Object.values(firstError.constraints)[0]);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get configuration service instance
  const config = app.get(ConfigService);

  // Get allowed origins for CORS configuration
  const allowedOrigins = config.getOrThrow<string>('CORS_ORIGINS').split(',');

  // Enable CORS with dynamic origin based on the request's origin header.
  app.enableCors({
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Cookie'],
    origin(origin, cb) {
      if (allowedOrigins.includes(origin)) {
        cb(null, origin);
      } else {
        cb(new Error('Not allowed by CORS'));
      }
    },
  });

  // Use global pipes for validation with custom exception factory.
  app.useGlobalPipes(
    new ValidationPipe({
      stopAtFirstError: true,
      whitelist: true,
      exceptionFactory,
    }),
  );

  await app.listen(config.get('PORT', 3000));
}
bootstrap();
