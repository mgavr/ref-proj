/**
 * The single function endpoint methods call. Each transport implements
 * this differently:
 *
 *   - cookieTransport (web): adds credentials:'include' so the browser
 *     attaches refproj_access / refproj_refresh cookies; never reads or
 *     writes Authorization.
 *
 *   - bearerTransport (mobile): adds Authorization: Bearer <accessToken>
 *     from getTokens(); on 401, calls /auth/mobile/refresh, persists the
 *     new tokens via setTokens(), retries the original request once.
 *
 * Endpoints don't know or care which transport they're hitting.
 */
export interface TransportRequest {
  /** HTTP method. */
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** Path relative to baseUrl (e.g. "/users/me"). Leading slash required. */
  path: string;
  /** JSON body for POST/PATCH. Omit for GET/DELETE. */
  body?: unknown;
}

export interface Transport {
  /**
   * Send a request and return the parsed JSON response. Throws ApiError
   * on non-2xx (after any internal retry, e.g. refresh-on-401).
   *
   * Returns `null` for 204 No Content.
   */
  request<T>(req: TransportRequest): Promise<T | null>;
}

/**
 * Common args every transport accepts. The factories add their own
 * specific fields on top.
 */
export interface TransportBaseArgs {
  baseUrl: string;
}
