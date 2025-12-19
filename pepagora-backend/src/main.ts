import { config } from 'dotenv';
config(); // Load .env values

// msanthoshhh

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptors';
import { winstonLogger } from './common/logger/winston-logger.service';

import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { log } from 'node:console';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonLogger, // ✅ Winston replaces default logger
  });

  app.use(cookieParser());
  // ✅ Enable CORS for frontend (supports both local and production)
  // Development URLs (hardcoded for local dev, can be overridden via env)
  // In production, FRONTEND_URL should be set via environment variables
  const frontendPort = process.env.FRONTEND_PORT || '7000';
  const allowedOrigins = [
    process.env.FRONTEND_URL_LOCALHOST || `http://localhost:${frontendPort}`,
    process.env.FRONTEND_URL_127 || `http://127.0.0.1:${frontendPort}`,
    process.env.FRONTEND_URL, // Production URL from env (required in production)
  ].filter(Boolean); // Remove undefined values

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS not allowed for origin: ${origin}`));
      }
    },
    credentials: true,
  });
  app.use(helmet()); // ✅ Security headers with Helmet

  // ✅ Global Exception Filter (Handles all errors)
  app.useGlobalFilters(new AllExceptionsFilter());

  // ✅ Global Interceptors
  app.useGlobalInterceptors(
    new ResponseInterceptor(), // Standardized API Response
    new LoggingInterceptor(), // Logs every request & response time
  );

  // ✅ Global Validation (class-validator & class-transformer)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove unexpected fields
      forbidNonWhitelisted: true, // throw error for extra fields
      transform: true, // transform to DTO classes
    }),
  );

  // ✅ Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('Pepagora Product API')
    .setDescription('Category, Subcategory, Product API')
    .setVersion('1.0')
    .addBearerAuth() // Add JWT authentication in Swagger
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = Number(process.env.PORT) || 8000;
  console.log('Starting server...', process.env.PORT);
  const host = process.env.APP_HOST || '0.0.0.0';
  const publicUrl = process.env.APP_PUBLIC_URL || `http://localhost:${port}`;
  await app.listen(port, host);
  console.log(`🚀 Server running on ${publicUrl}`);
}
void bootstrap();