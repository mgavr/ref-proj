import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/exception.filter';
import { loadEnv } from './config/env';

async function bootstrap(): Promise<void> {
  // Validate env before creating the Nest app; we want the process to exit
  // with a readable message if config is bad, not stack-trace from inside Nest.
  const env = loadEnv();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // cookie-parser populates req.cookies. Used by JwtAuthGuard,
  // AuthController, and the OAuth state cookie machinery.
  app.use(cookieParser());

  // CORS for the placeholder landing page (and later, the real Next.js
  // frontend). credentials:true is required for cookies to traverse
  // cross-origin requests. In dev with WEB_ORIGIN pointing at the API
  // itself, this is largely a no-op, but we leave it correct so the
  // Next.js step doesn't need a config change.
  app.enableCors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'healthz', method: RequestMethod.GET },
      { path: '/', method: RequestMethod.GET },
    ],
  });
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(env.PORT);
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${env.PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[api] health: http://localhost:${env.PORT}/healthz`);
  // eslint-disable-next-line no-console
  console.log(`[api] root:   http://localhost:${env.PORT}/`);
  // eslint-disable-next-line no-console
  console.log(`[api] me:     http://localhost:${env.PORT}/api/v1/users/me`);
}

void bootstrap();
