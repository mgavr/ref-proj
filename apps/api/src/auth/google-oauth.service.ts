import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { ApiErrorBody } from '@refproj/types';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUER = 'https://accounts.google.com';

/**
 * Information we extract from Google after a successful login. This is
 * what AuthService turns into a User+Identity row pair.
 */
export interface GoogleUserInfo {
  providerUserId: string;  // Google's `sub` claim, stable across changes
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
}

@Injectable()
export class GoogleOAuthService {
  // JWKS client is constructed once and caches Google's public keys.
  // It auto-rotates when Google rotates keys.
  private readonly jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

  constructor(@Inject(ENV) private readonly env: Env) {}

  /**
   * The redirect URI we register with Google AND ask the user to be
   * sent back to. Must match exactly the value in the Google Cloud
   * Console for this Web Client.
   */
  get redirectUri(): string {
    // Same hostname as WEB_ORIGIN — we set WEB_ORIGIN to the API host
    // in dev because there's no separate web frontend yet.
    return `${this.env.WEB_ORIGIN}/api/v1/auth/google/callback`;
  }

  /**
   * Build the URL we redirect the browser to in order to start Google's
   * OAuth flow. PKCE-protected even though we have a client_secret —
   * defense in depth, costs nothing.
   */
  buildAuthUrl(args: { state: string; codeVerifier: string }): string {
    const codeChallenge = createHash('sha256')
      .update(args.codeVerifier)
      .digest('base64url');

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set('client_id', this.env.GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('access_type', 'online');
    url.searchParams.set('prompt', 'select_account');
    url.searchParams.set('state', args.state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  /**
   * Exchange the authorization code for tokens, then derive a verified
   * GoogleUserInfo from the returned ID token. We don't actually need
   * the access_token Google issues us — userinfo comes from the ID
   * token, which is more efficient and avoids an extra HTTP call.
   */
  async exchangeCode(args: {
    code: string;
    codeVerifier: string;
  }): Promise<GoogleUserInfo> {
    const body = new URLSearchParams({
      client_id: this.env.GOOGLE_CLIENT_ID,
      client_secret: this.env.GOOGLE_CLIENT_SECRET,
      code: args.code,
      code_verifier: args.codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
    });

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw oauthProviderError(
        `Google token exchange failed (${res.status}): ${text}`,
      );
    }

    const json = (await res.json()) as { id_token?: string };
    if (!json.id_token) {
      throw oauthProviderError('Google response missing id_token');
    }

    return this.verifyIdToken(json.id_token);
  }

  /**
   * Verify a Google-issued ID token's signature, issuer, audience, and
   * expiry against Google's JWKS. Returns the user info extracted from
   * the verified claims.
   */
  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    let verified;
    try {
      verified = await jwtVerify(idToken, this.jwks, {
        issuer: [GOOGLE_ISSUER, 'accounts.google.com'],
        audience: this.env.GOOGLE_CLIENT_ID,
      });
    } catch (err) {
      throw oauthProviderError(
        `Google ID token verification failed: ${
          err instanceof Error ? err.message : 'unknown'
        }`,
      );
    }

    const c = verified.payload as Record<string, unknown>;
    const sub = typeof c.sub === 'string' ? c.sub : null;
    const email = typeof c.email === 'string' ? c.email : null;
    const emailVerified = c.email_verified === true;
    const name =
      typeof c.name === 'string' && c.name.length > 0
        ? c.name
        : typeof c.given_name === 'string'
          ? c.given_name
          : email ?? 'User';
    const picture = typeof c.picture === 'string' ? c.picture : null;

    if (!sub || !email) {
      throw oauthProviderError('Google ID token missing sub or email');
    }

    return {
      providerUserId: sub,
      email,
      emailVerified,
      name,
      avatarUrl: picture,
    };
  }
}

function oauthProviderError(message: string): HttpException {
  const body: ApiErrorBody = {
    error: { code: 'OAUTH_PROVIDER_ERROR', message },
  };
  return new HttpException(body, HttpStatus.BAD_GATEWAY);
}
