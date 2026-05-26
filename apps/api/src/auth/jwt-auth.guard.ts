import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
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
 * points to a deleted user is treated as unauthenticated — not a
 * 404, since the caller shouldn't be told whether the id ever existed.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly tokens: TokenService,
    private readonly db: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();

    const candidates = extractTokenCandidates(req);
    if (candidates.length === 0) {
      this.logger.warn('[guard] no credentials on request');
      throw unauthorized('No credentials.', 'UNAUTHENTICATED');
    }

    // Try each credential source in priority order: a foreign Bearer
    // header (e.g. injected by a browser extension or by a mobile app
    // using the wrong token) shouldn't block a valid cookie-based
    // session from authenticating.
    let lastError: unknown = null;
    for (const candidate of candidates) {
      try {
        const payload = await this.tokens.verifyAccessToken(candidate.token);
        const user = await this.db.user.findUnique({
          where: { id: payload.sub },
        });
        if (!user) {
          throw unauthorized('User no longer exists.', 'UNAUTHENTICATED');
        }
        this.logger.log(`[guard] auth OK via ${candidate.source}`);
        (req as Request & { user?: typeof user }).user = user;
        return true;
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `[guard] ${candidate.source} candidate rejected: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        // Fall through to try the next candidate.
      }
    }

    // All candidates failed. Map the last error.
    const errName = lastError instanceof Error ? lastError.constructor.name : '';
    const message = lastError instanceof Error ? lastError.message : 'unknown';
    if (errName === 'JWTExpired') {
      throw unauthorized('Access token expired.', 'TOKEN_EXPIRED');
    }
    if (errName === 'HttpException') {
      // We threw a structured HttpException above (e.g. user-not-found);
      // re-throw it unchanged.
      throw lastError as HttpException;
    }
    throw unauthorized(`Access token invalid: ${message}`, 'TOKEN_INVALID');
  }
}

function extractTokenCandidates(req: Request): Array<{ token: string; source: string }> {
  const out: Array<{ token: string; source: string }> = [];
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    out.push({ token: header.slice('Bearer '.length).trim(), source: 'header' });
  }
  const cookieJar = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (cookieJar && typeof cookieJar[COOKIE_ACCESS] === 'string') {
    out.push({ token: cookieJar[COOKIE_ACCESS], source: 'cookie' });
  }
  return out;
}

function unauthorized(message: string, code: ApiErrorCode): HttpException {
  const body: ApiErrorBody = {
    error: { code, message },
  };
  return new HttpException(body, HttpStatus.UNAUTHORIZED);
}
