import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ApiErrorBody, User as UserDto } from '@refproj/types';
import type { AuthProvider, User as DbUser } from '@prisma/client';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import { PrismaService } from '../database/prisma.service';
import { toUserDto } from '../users/user.mapper';
import type { GoogleUserInfo } from './google-oauth.service';
import { TokenService } from './token.service';

/**
 * The result of a successful login or refresh — what the controller
 * needs to set cookies (for web) or return as JSON (for mobile, later).
 */
export interface SessionResult {
  user: UserDto;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly db: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  // ---- Login (Google web) ------------------------------------------

  async loginWithGoogle(info: GoogleUserInfo): Promise<SessionResult> {
    if (!info.emailVerified) {
      // Should be impossible — Google requires verified emails on
      // its accounts. Defensive in case Google's contract ever changes.
      throw unauthenticated('Google email is not verified.');
    }

    const user = await this.findOrCreateUser('google', info);
    return this.issueSession(user);
  }

  // ---- Refresh -----------------------------------------------------

  /**
   * Validate the presented refresh token, rotate it, and return a new
   * session. Implements the OWASP-style theft detection from SPEC §4.3:
   * if a token has already been rotated (replacedById != null), revoke
   * the whole family.
   */
  async rotateRefreshToken(rawToken: string): Promise<SessionResult> {
    let payload;
    try {
      payload = await this.tokens.verifyRefreshToken(rawToken);
    } catch {
      throw unauthenticated('Refresh token invalid or expired.', 'TOKEN_INVALID');
    }

    const hash = this.tokens.hashRefreshToken(rawToken);
    const row = await this.db.refreshToken.findUnique({ where: { id: payload.jti } });

    if (!row) {
      // The signed JWT verifies, but it doesn't correspond to a stored
      // row — meaning we never issued this (or we deleted the user).
      // Defensive: treat as invalid, no family to revoke.
      throw unauthenticated('Refresh token not recognized.', 'TOKEN_INVALID');
    }

    if (row.tokenHash !== hash) {
      // The id matches but the hash doesn't. Should be impossible if
      // jti is unique, but if it happens, it's a tampering signal.
      await this.revokeFamily(row.familyId, 'hash mismatch');
      throw unauthenticated('Refresh token mismatch.', 'TOKEN_REVOKED');
    }

    if (row.revokedAt) {
      throw unauthenticated('Refresh token has been revoked.', 'TOKEN_REVOKED');
    }

    if (row.replacedById) {
      // Theft signal: an old token in a chain was presented. Burn the
      // whole family so the thief and the victim both have to log in.
      this.logger.warn(
        `[refresh-replay] family=${row.familyId} user=${row.userId} jti=${row.id}`,
      );
      await this.revokeFamily(row.familyId, 'replayed-after-rotation');
      throw unauthenticated('Refresh token already rotated.', 'TOKEN_REVOKED');
    }

    if (row.expiresAt < new Date()) {
      throw unauthenticated('Refresh token expired.', 'TOKEN_EXPIRED');
    }

    const user = await this.db.user.findUnique({ where: { id: row.userId } });
    if (!user) {
      throw unauthenticated('User no longer exists.');
    }

    // Issue a new token in the same family, link the chain.
    const next = await this.issueRefreshToken(user.id, {
      familyId: row.familyId,
      parentId: row.id,
    });

    // Mark the old one as rotated.
    await this.db.refreshToken.update({
      where: { id: row.id },
      data: { replacedById: next.id },
    });

    const accessToken = await this.tokens.signAccessToken({ sub: user.id });
    return {
      user: toUserDto(user),
      accessToken,
      refreshToken: next.signed,
    };
  }

  // ---- Logout ------------------------------------------------------

  /**
   * Revoke the family of the presented refresh token. Idempotent: if the
   * token is already invalid/missing/revoked, this is a no-op.
   */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    try {
      const payload = await this.tokens.verifyRefreshToken(rawToken);
      const row = await this.db.refreshToken.findUnique({
        where: { id: payload.jti },
      });
      if (row) {
        await this.revokeFamily(row.familyId, 'logout');
      }
    } catch {
      // Bad token = nothing to revoke.
    }
  }

  // ---- Helpers -----------------------------------------------------

  private async findOrCreateUser(
    provider: AuthProvider,
    info: GoogleUserInfo,
  ): Promise<DbUser> {
    // Look for an existing identity row first.
    const existingIdentity = await this.db.identity.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId: info.providerUserId,
        },
      },
      include: { user: true },
    });
    if (existingIdentity) {
      return existingIdentity.user;
    }

    // No identity for this provider+id. Try to match by email so a user
    // who first signed up via one provider doesn't end up duplicated if
    // they later add a second.
    const userByEmail = await this.db.user.findUnique({
      where: { email: info.email },
    });
    if (userByEmail) {
      await this.db.identity.create({
        data: {
          userId: userByEmail.id,
          provider,
          providerUserId: info.providerUserId,
          emailAtLink: info.email,
        },
      });
      return userByEmail;
    }

    // Truly new user.
    return this.db.user.create({
      data: {
        email: info.email,
        displayName: info.name,
        avatarUrl: info.avatarUrl,
        identities: {
          create: {
            provider,
            providerUserId: info.providerUserId,
            emailAtLink: info.email,
          },
        },
      },
    });
  }

  /**
   * Issue a fresh session: a new access token + a new refresh-token
   * family. Returns the bundle plus persisted row.
   */
  private async issueSession(user: DbUser): Promise<SessionResult> {
    const refresh = await this.issueRefreshToken(user.id, {
      familyId: randomUUID(),
      parentId: null,
    });
    const accessToken = await this.tokens.signAccessToken({ sub: user.id });
    return {
      user: toUserDto(user),
      accessToken,
      refreshToken: refresh.signed,
    };
  }

  private async issueRefreshToken(
    userId: string,
    chain: { familyId: string; parentId: string | null },
  ): Promise<{ id: string; signed: string }> {
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + this.env.JWT_REFRESH_TTL * 1000);

    const signed = await this.tokens.signRefreshToken({
      sub: userId,
      jti: id,
      family: chain.familyId,
    });

    await this.db.refreshToken.create({
      data: {
        id,
        userId,
        familyId: chain.familyId,
        parentId: chain.parentId,
        tokenHash: this.tokens.hashRefreshToken(signed),
        expiresAt,
      },
    });

    return { id, signed };
  }

  private async revokeFamily(familyId: string, reason: string): Promise<void> {
    this.logger.log(`[revoke-family] family=${familyId} reason=${reason}`);
    await this.db.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

function unauthenticated(
  message: string,
  code: 'UNAUTHENTICATED' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'TOKEN_REVOKED' = 'UNAUTHENTICATED',
): HttpException {
  const body: ApiErrorBody = {
    error: { code, message },
  };
  return new HttpException(body, HttpStatus.UNAUTHORIZED);
}
