import type { Response } from 'express';
import { serialize, type SerializeOptions } from 'cookie';
import type { Env } from '../config/env';

/**
 * Cookie names. Centralized so we have one source of truth across
 * the auth controller, the JwtAuthGuard, and the logout handler.
 */
export const COOKIE_ACCESS = 'refproj_access';
export const COOKIE_REFRESH = 'refproj_refresh';
export const COOKIE_OAUTH_STATE = 'refproj_oauth_state';

/**
 * Path that scopes the refresh cookie to just the refresh endpoint.
 * The browser won't include this cookie on any other request, so a
 * compromised cookie returned in non-/auth responses can't leak it.
 */
export const REFRESH_COOKIE_PATH = '/api/v1/auth/refresh';

interface SetSessionCookiesArgs {
  res: Response;
  env: Env;
  accessToken: string;
  refreshToken: string;
}

/**
 * Set the access + refresh session cookies after a successful login
 * or refresh. SameSite=Lax is correct for our flow: the OAuth callback
 * is a top-level GET navigation (Lax allows the cookie to be set and
 * subsequently sent), and CSRF on state-changing requests is mitigated
 * by Lax preventing implicit cross-site POSTs.
 */
export function setSessionCookies({
  res,
  env,
  accessToken,
  refreshToken,
}: SetSessionCookiesArgs): void {
  const baseOpts: SerializeOptions = {
    httpOnly: true,
    secure: env.NODE_ENV !== 'development' || isCodespacesHost(env.WEB_ORIGIN),
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN,
  };

  res.appendHeader('Set-Cookie', serialize(COOKIE_ACCESS, accessToken, {
    ...baseOpts,
    path: '/',
    maxAge: env.JWT_ACCESS_TTL,
  }));

  res.appendHeader('Set-Cookie', serialize(COOKIE_REFRESH, refreshToken, {
    ...baseOpts,
    path: REFRESH_COOKIE_PATH,
    maxAge: env.JWT_REFRESH_TTL,
  }));
}

/**
 * Clear the session cookies on logout. Set with empty value, maxAge 0,
 * and matching attributes (cookies are deleted by re-setting with the
 * same name+path+domain).
 */
export function clearSessionCookies(res: Response, env: Env): void {
  const baseOpts: SerializeOptions = {
    httpOnly: true,
    secure: env.NODE_ENV !== 'development' || isCodespacesHost(env.WEB_ORIGIN),
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN,
    maxAge: 0,
  };

  res.appendHeader('Set-Cookie', serialize(COOKIE_ACCESS, '', {
    ...baseOpts,
    path: '/',
  }));
  res.appendHeader('Set-Cookie', serialize(COOKIE_REFRESH, '', {
    ...baseOpts,
    path: REFRESH_COOKIE_PATH,
  }));
}

interface SetOAuthStateCookieArgs {
  res: Response;
  env: Env;
  value: string;
}

/**
 * Short-lived cookie that holds OAuth state + PKCE verifier during
 * the redirect to Google. Read back in the callback handler.
 * 10-minute expiry is more than enough for any real login.
 */
export function setOAuthStateCookie({
  res,
  env,
  value,
}: SetOAuthStateCookieArgs): void {
  res.appendHeader('Set-Cookie', serialize(COOKIE_OAUTH_STATE, value, {
    httpOnly: true,
    secure: env.NODE_ENV !== 'development' || isCodespacesHost(env.WEB_ORIGIN),
    sameSite: 'lax',
    path: '/api/v1/auth',
    domain: env.COOKIE_DOMAIN,
    maxAge: 600,
  }));
}

export function clearOAuthStateCookie(res: Response, env: Env): void {
  res.appendHeader('Set-Cookie', serialize(COOKIE_OAUTH_STATE, '', {
    httpOnly: true,
    secure: env.NODE_ENV !== 'development' || isCodespacesHost(env.WEB_ORIGIN),
    sameSite: 'lax',
    path: '/api/v1/auth',
    domain: env.COOKIE_DOMAIN,
    maxAge: 0,
  }));
}

/**
 * GitHub Codespaces serves forwarded ports over HTTPS even when
 * NODE_ENV=development. Cookies with sameSite=lax must be Secure if
 * they're going to traverse HTTPS. Detect by URL scheme.
 */
function isCodespacesHost(webOrigin: string): boolean {
  return webOrigin.startsWith('https://');
}
