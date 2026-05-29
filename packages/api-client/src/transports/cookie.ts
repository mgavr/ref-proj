import { apiErrorFromResponse } from '../error.js';
import type { Transport, TransportBaseArgs, TransportRequest } from '../transport.js';

/**
 * Web transport. Browsers send and receive cookies automatically; we
 * just have to ask fetch to include credentials on cross-origin
 * requests (`credentials: 'include'`).
 *
 * No refresh logic here: in the web flow the user gets a 401, the
 * web app calls POST /auth/refresh (also via this transport), and
 * the browser handles cookie storage transparently. Endpoint code can
 * call refresh explicitly if it wants to retry, but we don't auto-retry
 * here — auto-retry-on-401 is a mobile-only convenience.
 */
export function cookieTransport(args: TransportBaseArgs): Transport {
  return {
    async request<T>(req: TransportRequest): Promise<T | null> {
      const res = await fetch(`${args.baseUrl}${req.path}`, {
        method: req.method,
        credentials: 'include',
        headers: req.body !== undefined
          ? { 'Content-Type': 'application/json' }
          : undefined,
        body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
      });

      if (!res.ok) {
        throw await apiErrorFromResponse(res);
      }
      if (res.status === 204) return null;
      return (await res.json()) as T;
    },
  };
}
