import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { ApiErrorBody, ApiErrorCode } from '@refproj/types';
import { PrismaService } from '../database/prisma.service';
import { COOKIE_ACCESS } from './cookies';
import { TokenService } from './token.service';

/**
 * Real auth guard. Resolves the current user from:
 *   1. Authorization: Bearer <jwt>  (mobile + API clients)
 *   2. refproj_access cookie        (web)
 *
 * Loads the User row from Postgres and attaches it to the request so
 * @CurrentUser() can read it downstream. A token that verifies but
 * points to a deleted user is treated as unauthenticated \u2014 not a
 * 404, since the caller shouldn't be told whether the id ever existed.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly db: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();

    const token = extractToken(req);
    if (!token) {
      throw unauthorized('No credentials.', 'UNAUTHENTICATED');
    }

    let payload;
    try {
      payload = await this.tokens.verifyAccessToken(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      // jose throws specific error classes; check by name rather than
      // depending on the class identity, which can vary across import
      // styles.
      const errName = err instanceof Error ? err.constructor.name : '';
      if (errName === 'JWTExpired') {
        throw unauthorized('Access token expired.', 'TOKEN_EXPIRED');
      }
      throw unauthorized(`Access token invalid: ${message}`, 'TOKEN_INVALID');
    }

    const user = await this.db.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw unauthorized('User no longer exists.', 'UNAUTHENTICATED');
    }

    (req as Request & { user?: typeof user }).user = user;
    return true;
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  // cookie-parser middleware populates req.cookies.
  const cookieJar = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (cookieJar && typeof cookieJar[COOKIE_ACCESS] === 'string') {
    return cookieJar[COOKIE_ACCESS];
  }
  return null;
}

function unauthorized(message: string, code: ApiErrorCode): HttpException {
  const body: ApiErrorBody = {
    error: { code, message },
  };
  return new HttpException(body, HttpStatus.UNAUTHORIZED);
}
