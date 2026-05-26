import type { Request, Response } from 'express';
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
  req: Request;
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
 *
 * In tunneled contexts (GitHub Codespaces' *.app.github.dev proxy),
 * cookies are also marked Partitioned so Chrome's CHIPS policy allows
 * them. Without this, the tunnel's own cookies are kept but ours are
 * dropped.
 */
export function setSessionCookies({
  req,
  res,
  env,
  accessToken,
  refreshToken,
}: SetSessionCookiesArgs): void {
  const baseOpts = buildBaseOpts(req, env);

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
export function clearSessionCookies(req: Request, res: Response, env: Env): void {
  const baseOpts = { ...buildBaseOpts(req, env), maxAge: 0 };

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
  req: Request;
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
  req,
  res,
  env,
  value,
}: SetOAuthStateCookieArgs): void {
  res.appendHeader('Set-Cookie', serialize(COOKIE_OAUTH_STATE, value, {
    ...buildBaseOpts(req, env),
    path: '/api/v1/auth',
    maxAge: 600,
  }));
}

export function clearOAuthStateCookie(req: Request, res: Response, env: Env): void {
  res.appendHeader('Set-Cookie', serialize(COOKIE_OAUTH_STATE, '', {
    ...buildBaseOpts(req, env),
    path: '/api/v1/auth',
    maxAge: 0,
  }));
}

// ----- helpers ---------------------------------------------------------

/**
 * The cookie attributes shared by every session cookie. The interesting
 * decisions:
 *
 *   - `secure`: required when the response is delivered over HTTPS.
 *     The req-based detection covers both prod (HTTPS) and Codespaces
 *     (HTTPS via tunnel), where NODE_ENV=development but the browser
 *     still sees us as HTTPS.
 *
 *   - `partitioned`: required when we're behind a reverse-proxy tunnel
 *     that the browser treats as a separate top-level site (i.e.
 *     Codespaces' *.app.github.dev). Chrome's CHIPS policy otherwise
 *     drops our cookies in favor of the tunnel's own.
 *
 *   - `sameSite`: 'none' when Partitioned (required pairing), 'lax'
 *     otherwise.
 */
function buildBaseOpts(req: Request, env: Env): SerializeOptions {
  const tunneled = isTunneledRequest(req);
  const httpsDelivery = tunneled || requestIsHttps(req) || env.NODE_ENV !== 'development';

  // Partitioned cookies MUST also be Secure and SameSite=None per the
  // CHIPS spec. Browsers ignore Partitioned if either is missing.
  if (tunneled) {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      partitioned: true,
      domain: env.COOKIE_DOMAIN,
    };
  }

  return {
    httpOnly: true,
    secure: httpsDelivery,
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN,
  };
}

/**
 * True if the request reached us via a reverse-proxy tunnel where the
 * browser's apparent origin differs from ours. Currently detects
 * GitHub Codespaces (and any future similar tunnel by host suffix).
 *
 * We rely on X-Forwarded-Host being set by the tunnel; an attacker
 * connecting directly to the API can spoof it, but our cookie attribute
 * decision in dev is not security-sensitive (the cookies are still
 * httpOnly and Secure). In production behind a known proxy, configure
 * Express trust-proxy to validate the header source.
 */
function isTunneledRequest(req: Request): boolean {
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
  if (typeof host !== 'string') return false;
  return host.endsWith('.app.github.dev') || host.endsWith('.github.dev');
}

function requestIsHttps(req: Request): boolean {
  const proto = req.headers['x-forwarded-proto'];
  const value = Array.isArray(proto) ? proto[0] : proto;
  if (typeof value === 'string') return value === 'https';
  return req.protocol === 'https';
}
