import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/exception.filter';
import { loadEnv } from './config/env';

async function bootstrap(): Promise<void> {
  // Validate env before creating the Nest app; we want the process to exit
  // with a readable message if config is bad, not stack-trace from inside Nest.
  const env = loadEnv();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('api/v1', { exclude: ['healthz'] });
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(env.PORT);
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${env.PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[api] health: http://localhost:${env.PORT}/healthz`);
  // eslint-disable-next-line no-console
  console.log(`[api] me:     http://localhost:${env.PORT}/api/v1/users/me`);
}

void bootstrap();
