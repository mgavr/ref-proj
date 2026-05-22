import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { User as DbUser } from '@prisma/client';
import type { Request } from 'express';

/**
 * Returns the currently authenticated user, as loaded by FakeAuthGuard
 * (in step 3) or the real JwtAuthGuard (in step 4).
 *
 * Type is the Prisma row, not the public DTO. Controllers map to the
 * DTO at the response boundary.
 *
 * Usage:
 *   @UseGuards(FakeAuthGuard)
 *   @Get('me')
 *   me(@CurrentUser() user: DbUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DbUser => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: DbUser }>();
    if (!req.user) {
      throw new Error(
        'CurrentUser used on a route without an auth guard \u2014 no user attached.',
      );
    }
    return req.user;
  },
);
