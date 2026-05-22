import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { z } from 'zod';
import type { Request } from 'express';
import type { ApiErrorBody } from '@refproj/types';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import { PrismaService } from '../database/prisma.service';

/**
 * TEMPORARY guard for steps 3\u2013pre-4. Replaced by real JWT auth in step 4.
 *
 * Resolves the "current user" from:
 *   1. X-Fake-User-Id request header (if set), or
 *   2. DEV_FAKE_USER_ID env var (the seeded developer user), or
 *   3. fail with 401.
 *
 * Either way it loads the user from Postgres so downstream handlers
 * get a real User row, not a fabrication.
 */
@Injectable()
export class FakeAuthGuard implements CanActivate {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly db: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();

    const headerValue = req.headers['x-fake-user-id'];
    const headerId = typeof headerValue === 'string' ? headerValue : undefined;
    const fallbackId = this.env.DEV_FAKE_USER_ID;

    const candidate = headerId ?? fallbackId;
    if (!candidate) {
      throw unauthenticated(
        'No X-Fake-User-Id header and DEV_FAKE_USER_ID is not set.',
      );
    }

    const parsed = z.string().uuid().safeParse(candidate);
    if (!parsed.success) {
      throw unauthenticated('Fake user id is not a valid UUID.');
    }

    const user = await this.db.user.findUnique({ where: { id: parsed.data } });
    if (!user) {
      throw unauthenticated(
        `No user with id ${parsed.data} \u2014 did you run \`pnpm db:seed\`?`,
      );
    }

    // Attach to the request so @CurrentUser() can pick it up.
    (req as Request & { user?: typeof user }).user = user;
    return true;
  }
}

function unauthenticated(message: string): HttpException {
  const body: ApiErrorBody = {
    error: { code: 'UNAUTHENTICATED', message },
  };
  return new HttpException(body, HttpStatus.UNAUTHORIZED);
}
