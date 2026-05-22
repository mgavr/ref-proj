import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Wraps PrismaClient with NestJS lifecycle hooks so the connection
 * is opened/closed alongside the app.
 *
 * Inject this anywhere you need DB access:
 *   constructor(private readonly db: PrismaService) {}
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
