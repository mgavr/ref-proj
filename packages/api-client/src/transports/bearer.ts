import type { MobileSessionResponse, TokenPair } from '@refproj/types';
import { ApiError, apiErrorFromResponse } from '../error.js';
import type { Transport, TransportBaseArgs, TransportRequest } from '../transport.js';

/**
 * The callbacks the bearer transport uses to read/write the caller's
 * token storage. On Expo this is SecureStore-backed; on a Node CLI it
 * could be process memory. The transport doesn't care, as long as
 * get/set/clear are persistent across the calling app's lifetime.
 *
 * `getTokens` may return null when not logged in — the transport will
 * just send the request without an Authorization header. If that
 * request requires auth, it'll get a 401 back like any other, and
 * the caller is expected to redirect to login.
 */
export interface TokenStorage {
  getTokens(): Promise<TokenPair | null> | TokenPair | null;
  setTokens(tokens: TokenPair): Promise<void> | void;
  clearTokens(): Promise<void> | void;
}

export interface BearerTransportArgs extends TransportBaseArgs {
  storage: TokenStorage;
}

/**
 * Mobile transport.
 *
 * Each request:
 *   1. Read tokens from storage; attach Authorization if accessToken exists.
 *   2. fetch the request.
 *   3. If response is 2xx → return parsed JSON (or null for 204).
 *   4. If 401 AND we have a refreshToken AND this isn't itself a refresh
 *      attempt → call POST /auth/mobile/refresh, persist the new tokens,
 *      retry the original request once. Surface the retry's result
 *      whatever it is.
 *   5. Otherwise → throw ApiError parsed from the body.
 *
 * The "isn't itself a refresh attempt" guard prevents infinite loops if
 * refresh itself returns 401 (e.g. the refresh token was revoked).
 */
export function bearerTransport(args: BearerTransportArgs): Transport {
  const refreshPath = '/auth/mobile/refresh';

  async function doFetch(
    req: TransportRequest,
    tokens: TokenPair | null,
  ): Promise<Response> {
    const headers: Record<string, string> = {};
    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }
    if (req.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(`${args.baseUrl}${req.path}`, {
      method: req.method,
      headers,
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
    });
  }

  async function tryRefresh(refreshToken: string): Promise<TokenPair | null> {
    const res = await fetch(`${args.baseUrl}${refreshPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as MobileSessionResponse;
    return body.tokens;
  }

  return {
    async request<T>(req: TransportRequest): Promise<T | null> {
      const tokens = (await args.storage.getTokens()) ?? null;
      let res = await doFetch(req, tokens);

      // Refresh-on-401 path.
      const isRefreshRequest = req.path === refreshPath;
      if (
        res.status === 401 &&
        !isRefreshRequest &&
        tokens?.refreshToken
      ) {
        const fresh = await tryRefresh(tokens.refreshToken);
        if (fresh) {
          await args.storage.setTokens(fresh);
          res = await doFetch(req, fresh);
        } else {
          // Refresh failed — our session is dead. Clear storage so the
          // app's auth-state listener can react and redirect to login.
          await args.storage.clearTokens();
          throw new ApiError({
            code: 'UNAUTHENTICATED',
            message: 'Session expired and refresh failed.',
            status: 401,
          });
        }
      }

      if (!res.ok) {
        throw await apiErrorFromResponse(res);
      }
      if (res.status === 204) return null;
      return (await res.json()) as T;
    },
  };
}
