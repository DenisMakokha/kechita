import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { winstonConfig } from './common/logger/winston.config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? WinstonModule.createLogger(winstonConfig)
      : undefined,
  });
  const logger = new Logger('Bootstrap');

  // Validate required env vars
  if (!process.env.JWT_SECRET) {
    logger.error('FATAL: JWT_SECRET environment variable is not set. Exiting.');
    process.exit(1);
  }

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  }));

  // Gzip compression — ~60-80% smaller responses
  app.use(compression());

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Logging Interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS for frontend
  const corsOrigins = (process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL]
      : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://localhost:5177',
      ]);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    exposedHeaders: ['x-correlation-id'],
  });

  // Swagger/OpenAPI Documentation — disabled in production for performance
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Kechita Staff Portal API')
      .setDescription(`
        Comprehensive API for the Kechita Staff Portal and Operations Management System.
        
        ## Modules
        - **Auth**: Authentication and authorization
        - **Org**: Organization structure (Regions, Branches, Departments, Positions)
        - **Staff**: Staff management, documents, onboarding
        - **Leave**: Leave types, requests, balances, conflict detection
        - **Approval**: Approval workflows and instances
        - **Claims**: Expense claims management
        - **Loans**: Staff loans and repayment schedules
        - **Recruitment**: Job posts, candidates, applications, interviews
        - **Reports**: Branch daily reports and analytics
        - **Notifications**: In-app notifications
      `)
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Auth', 'Authentication and token management')
      .addTag('Org', 'Organization structure management')
      .addTag('Staff', 'Staff and employee management')
      .addTag('Documents', 'Staff document management')
      .addTag('Leave', 'Leave management and conflict detection')
      .addTag('Approval', 'Approval workflows')
      .addTag('Claims', 'Expense claims')
      .addTag('Loans', 'Staff loans and payroll deductions')
      .addTag('Recruitment', 'Job posts and candidate management')
      .addTag('Reports', 'Analytics and reports')
      .addTag('Notifications', 'In-app notifications')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        filter: true,
        showRequestDuration: true,
      },
      customSiteTitle: 'Kechita Staff Portal API Docs',
    });
    logger.log(`📚 Swagger docs available at: http://localhost:${process.env.PORT ?? 3000}/api/docs`);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();

