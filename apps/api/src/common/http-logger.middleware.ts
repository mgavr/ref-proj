import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * One log line per HTTP request, written when the response finishes.
 * Format:
 *   GET /api/v1/users/me 200 12ms
 *   POST /api/v1/auth/refresh 401 4ms
 *
 * Wired into AppModule via configure(). Keep it tiny — verbose request
 * logging is for prod observability, not dev terminal noise.
 */
@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const elapsedNs = process.hrtime.bigint() - start;
      const elapsedMs = Number(elapsedNs / 1_000_000n);
      this.logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedMs}ms`,
      );
    });
    next();
  }
}
