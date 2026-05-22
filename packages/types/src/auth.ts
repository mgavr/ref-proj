import { z } from 'zod';
import { OAuthProvider } from './providers.js';
import { User } from './user.js';

/**
 * Body of POST /auth/mobile/verify.
 *
 * Per SPEC.md \u00a74.2, mobile clients obtain a provider-issued credential
 * locally (ID token for Google/Facebook, authorization code for GitHub
 * since GitHub doesn't issue ID tokens) and post it to the backend for
 * verification + session issuance.
 *
 * The discriminated union enforces that `id_token` is required for
 * google/facebook and `code` (+ PKCE verifier) for github.
 */
export const MobileVerifyRequest = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('google'),
    idToken: z.string().min(1),
  }),
  z.object({
    provider: z.literal('facebook'),
    accessToken: z.string().min(1),
  }),
  z.object({
    provider: z.literal('github'),
    code: z.string().min(1),
    codeVerifier: z.string().min(1),
    redirectUri: z.string().url(),
  }),
]);

export type MobileVerifyRequest = z.infer<typeof MobileVerifyRequest>;

/**
 * The session bundle returned to mobile clients after a successful login
 * or refresh. Web clients receive the same tokens, but via httpOnly
 * cookies set on the response \u2014 the body is just `{ user }`.
 */
export const TokenPair = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  /** Seconds until the access token expires. */
  expiresIn: z.number().int().positive(),
});

export type TokenPair = z.infer<typeof TokenPair>;

/**
 * Response from POST /auth/mobile/verify (mobile) and the body shape
 * returned by /auth/refresh on mobile.
 */
export const MobileSessionResponse = z.object({
  user: User,
  tokens: TokenPair,
});

export type MobileSessionResponse = z.infer<typeof MobileSessionResponse>;

/**
 * Response body from web auth endpoints. Tokens travel as cookies, not JSON.
 */
export const WebSessionResponse = z.object({
  user: User,
});

export type WebSessionResponse = z.infer<typeof WebSessionResponse>;

/**
 * Body of POST /auth/refresh from mobile. Web sends the refresh token via
 * the `refproj_refresh` httpOnly cookie and posts an empty body.
 */
export const MobileRefreshRequest = z.object({
  refreshToken: z.string().min(1),
});

export type MobileRefreshRequest = z.infer<typeof MobileRefreshRequest>;

/**
 * The query parameters of GET /auth/:provider/start \u2014 web only.
 * `returnTo` lets the web app deep-link back to the page that triggered
 * login (defaults to /account on the configured WEB_ORIGIN).
 */
export const StartAuthQuery = z.object({
  returnTo: z.string().optional(),
});

export type StartAuthQuery = z.infer<typeof StartAuthQuery>;

/**
 * Path parameter for /auth/:provider/* routes.
 */
export const AuthProviderParam = z.object({
  provider: OAuthProvider,
});

export type AuthProviderParam = z.infer<typeof AuthProviderParam>;
