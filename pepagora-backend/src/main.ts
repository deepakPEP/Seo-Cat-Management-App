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

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonLogger, // ✅ Winston replaces default logger
  });

  app.use(cookieParser());
  // ✅ Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:7000',
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

  const port = process.env.PORT || 8000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
}
void bootstrap();
