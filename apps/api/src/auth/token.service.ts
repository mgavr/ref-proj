import { Inject, Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'node:crypto';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';

/**
 * Shape of the access-token JWT payload. Kept minimal on purpose:
 * the API re-fetches the user from Postgres on each request, so the
 * token's job is just to identify *which* user this is.
 */
export interface AccessTokenPayload {
  sub: string; // user.id
}

/**
 * Shape of the refresh-token JWT payload. `jti` is the refresh_tokens.id
 * primary key — the token's identity in our DB. We hash the full signed
 * JWT string (not just the jti) and store the hash in token_hash to
 * prevent any DB compromise from yielding usable refresh tokens.
 */
export interface RefreshTokenPayload {
  sub: string;     // user.id
  jti: string;     // refresh_tokens.id (uuid)
  family: string;  // refresh_tokens.family_id (uuid)
}

@Injectable()
export class TokenService {
  private readonly accessSecret: Uint8Array;
  private readonly refreshSecret: Uint8Array;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
    this.refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);
  }

  // ---- Access tokens ------------------------------------------------

  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${this.env.JWT_ACCESS_TTL}s`)
      .sign(this.accessSecret);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret);
    if (typeof payload.sub !== 'string') {
      throw new Error('access token missing sub');
    }
    return { sub: payload.sub };
  }

  // ---- Refresh tokens -----------------------------------------------

  async signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    return new SignJWT({ ...payload, jti: payload.jti, family: payload.family })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${this.env.JWT_REFRESH_TTL}s`)
      .setJti(payload.jti)
      .sign(this.refreshSecret);
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    const { payload } = await jwtVerify(token, this.refreshSecret);
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.jti !== 'string' ||
      typeof payload.family !== 'string'
    ) {
      throw new Error('refresh token missing required claims');
    }
    return {
      sub: payload.sub,
      jti: payload.jti,
      family: payload.family,
    };
  }

  /**
   * Hash the raw refresh-token string for storage. Even if the
   * refresh_tokens.token_hash column leaks, no one can reconstruct the
   * signed JWT from it.
   */
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate cryptographically-random hex string for use as OAuth state,
   * PKCE verifier, etc.
   */
  randomString(bytes = 32): string {
    return randomBytes(bytes).toString('hex');
  }
}
