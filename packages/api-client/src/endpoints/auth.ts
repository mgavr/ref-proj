import type {
  MobileSessionResponse,
  WebSessionResponse,
} from '@refproj/types';
import type { Transport } from '../transport.js';

/**
 * Auth endpoints exposed by the client. Same shape regardless of
 * transport — what differs is whether the access/refresh tokens travel
 * as cookies (web) or in request bodies (mobile).
 *
 * Web flow:
 *   - The Sign-In button is a plain <a href={apiBaseUrl + auth.googleStartUrl()}>
 *     so the browser does a top-level navigation. No JS call for that.
 *   - After the OAuth round-trip the user lands back at WEB_ORIGIN with
 *     session cookies set. Web can then call refresh() / logout() via
 *     this client and the cookies are sent automatically.
 *
 * Mobile flow:
 *   - The app gets a Google ID token from expo-auth-session, then calls
 *     mobileVerify(idToken) to exchange it for a session bundle. Store
 *     the returned tokens in your TokenStorage.
 *   - refresh() and logout() use mobile/* endpoints with body params.
 */
export function authEndpoints(args: {
  transport: Transport;
  baseUrl: string;
}) {
  return {
    /**
     * Returns the URL the web Sign-In button should link to. Doesn't
     * make a request itself; the browser navigates here.
     */
    googleStartUrl(): string {
      return `${args.baseUrl}/auth/google/start`;
    },

    /**
     * Mobile: exchange a Google ID token (from expo-auth-session) for
     * a session. Returns the new user + token bundle. Store the tokens
     * in your TokenStorage afterward.
     */
    mobileVerify(idToken: string): Promise<MobileSessionResponse> {
      return args.transport.request<MobileSessionResponse>({
        method: 'POST',
        path: '/auth/mobile/verify',
        body: { provider: 'google', idToken },
      }) as Promise<MobileSessionResponse>;
    },

    /**
     * Web: rotate the refresh token via cookies. Returns the user
     * (tokens travel as new cookies, not in the body).
     */
    refreshWeb(): Promise<WebSessionResponse> {
      return args.transport.request<WebSessionResponse>({
        method: 'POST',
        path: '/auth/refresh',
      }) as Promise<WebSessionResponse>;
    },

    /**
     * Mobile: rotate the refresh token via body. Returns the full new
     * session bundle. Usually you don't call this directly — the bearer
     * transport handles refresh-on-401 silently. Exposed for explicit
     * refresh flows (e.g. "tap to refresh" debug screens).
     */
    refreshMobile(refreshToken: string): Promise<MobileSessionResponse> {
      return args.transport.request<MobileSessionResponse>({
        method: 'POST',
        path: '/auth/mobile/refresh',
        body: { refreshToken },
      }) as Promise<MobileSessionResponse>;
    },

    /**
     * Web: revoke the refresh family and clear cookies.
     */
    logoutWeb(): Promise<null> {
      return args.transport.request<null>({
        method: 'POST',
        path: '/auth/logout',
      }) as Promise<null>;
    },

    /**
     * Mobile: revoke the refresh family. The caller should also clear
     * its TokenStorage afterward.
     */
    logoutMobile(refreshToken: string): Promise<null> {
      return args.transport.request<null>({
        method: 'POST',
        path: '/auth/mobile/logout',
        body: { refreshToken },
      }) as Promise<null>;
    },
  };
}
