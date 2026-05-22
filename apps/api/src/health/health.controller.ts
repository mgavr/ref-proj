import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorBody } from '@refproj/types';
import { PrismaService } from '../database/prisma.service';

@Controller('healthz')
export class HealthController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  async health(): Promise<{ status: 'ok'; db: 'ok' }> {
    try {
      await this.db.$queryRaw`SELECT 1`;
    } catch (err) {
      const body: ApiErrorBody = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database unreachable.',
          details: { reason: err instanceof Error ? err.message : 'unknown' },
        },
      };
      throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { status: 'ok', db: 'ok' };
  }
}
