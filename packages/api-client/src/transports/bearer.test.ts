import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';
import type { TokenPair } from '@refproj/types';
import { ApiError } from '../error.js';
import { bearerTransport, type TokenStorage } from './bearer.js';

/**
 * Test fixture: an in-memory TokenStorage and a recorded sequence of
 * fetch calls. We swap globalThis.fetch with a controlled stub.
 */
type Call = { url: string; method: string; authorization: string | undefined; body: unknown };

function makeStorage(initial: TokenPair | null): TokenStorage & {
  reads: number;
  writes: TokenPair[];
  cleared: number;
} {
  let current = initial;
  return {
    reads: 0,
    writes: [],
    cleared: 0,
    getTokens() {
      this.reads++;
      return current;
    },
    setTokens(t: TokenPair) {
      this.writes.push(t);
      current = t;
    },
    clearTokens() {
      this.cleared++;
      current = null;
    },
  };
}

let originalFetch: typeof fetch;
let calls: Call[];
let responses: Array<{ status: number; body?: unknown }>;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  calls = [];
  responses = [];

  globalThis.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    const headers = init?.headers as Record<string, string> | undefined;
    calls.push({
      url,
      method: init?.method ?? 'GET',
      authorization: headers?.['Authorization'],
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    const resp = responses.shift();
    if (!resp) {
      throw new Error(`No queued response for ${init?.method ?? 'GET'} ${url}`);
    }
    // The Response constructor rejects bodies on 204/205/304 per WHATWG.
    if (resp.status === 204 || resp.status === 205 || resp.status === 304) {
      return new Response(null, { status: resp.status });
    }
    return new Response(resp.body !== undefined ? JSON.stringify(resp.body) : '', {
      status: resp.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('bearerTransport', () => {
  const baseUrl = 'https://api.test/api/v1';

  it('attaches Authorization header from storage', async () => {
    const storage = makeStorage({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 900,
    });
    const t = bearerTransport({ baseUrl, storage });

    responses.push({ status: 200, body: { id: 'u1' } });
    const result = await t.request<{ id: string }>({ method: 'GET', path: '/users/me' });

    assert.deepEqual(result, { id: 'u1' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.authorization, 'Bearer access-1');
  });

  it('sends no Authorization header if storage is empty', async () => {
    const storage = makeStorage(null);
    const t = bearerTransport({ baseUrl, storage });

    responses.push({ status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'nope' } } });
    await assert.rejects(
      () => t.request({ method: 'GET', path: '/users/me' }),
      (e: unknown) =>
        e instanceof ApiError && e.code === 'UNAUTHENTICATED' && e.status === 401,
    );
    assert.equal(calls[0]!.authorization, undefined);
  });

  it('returns null for 204 No Content', async () => {
    const storage = makeStorage({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 900,
    });
    const t = bearerTransport({ baseUrl, storage });

    responses.push({ status: 204 });
    const result = await t.request({ method: 'POST', path: '/auth/mobile/logout', body: { refreshToken: 'x' } });
    assert.equal(result, null);
  });

  it('refreshes on 401 and retries the original request', async () => {
    const storage = makeStorage({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      expiresIn: 900,
    });
    const t = bearerTransport({ baseUrl, storage });

    // First /users/me: 401 (access expired)
    responses.push({ status: 401, body: { error: { code: 'TOKEN_EXPIRED', message: 'gone' } } });
    // Refresh call: 200, returns new tokens
    responses.push({
      status: 200,
      body: {
        user: { id: 'u1', email: 'a@b.co', displayName: 'x', avatarUrl: null, createdAt: '2024-01-01T00:00:00.000Z' },
        tokens: { accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 900 },
      },
    });
    // Retried /users/me: 200
    responses.push({ status: 200, body: { id: 'u1' } });

    const result = await t.request<{ id: string }>({ method: 'GET', path: '/users/me' });

    assert.deepEqual(result, { id: 'u1' });
    assert.equal(calls.length, 3);
    assert.equal(calls[0]!.authorization, 'Bearer old-access');
    assert.equal(calls[1]!.url, `${baseUrl}/auth/mobile/refresh`);
    assert.deepEqual(calls[1]!.body, { refreshToken: 'old-refresh' });
    assert.equal(calls[2]!.authorization, 'Bearer new-access');

    assert.equal(storage.writes.length, 1);
    assert.equal(storage.writes[0]!.accessToken, 'new-access');
  });

  it('clears storage and throws if refresh fails after 401', async () => {
    const storage = makeStorage({
      accessToken: 'old',
      refreshToken: 'old-refresh',
      expiresIn: 900,
    });
    const t = bearerTransport({ baseUrl, storage });

    responses.push({ status: 401, body: { error: { code: 'TOKEN_EXPIRED', message: 'gone' } } });
    // Refresh fails (e.g. revoked family)
    responses.push({ status: 401, body: { error: { code: 'TOKEN_REVOKED', message: 'family revoked' } } });

    await assert.rejects(
      () => t.request({ method: 'GET', path: '/users/me' }),
      (e: unknown) => e instanceof ApiError && e.code === 'UNAUTHENTICATED',
    );
    assert.equal(storage.cleared, 1);
  });

  it('does not retry-on-401 for the refresh endpoint itself (no loop)', async () => {
    const storage = makeStorage({
      accessToken: 'old',
      refreshToken: 'old-refresh',
      expiresIn: 900,
    });
    const t = bearerTransport({ baseUrl, storage });

    // The refresh call itself returns 401
    responses.push({ status: 401, body: { error: { code: 'TOKEN_REVOKED', message: 'gone' } } });

    await assert.rejects(
      () => t.request({ method: 'POST', path: '/auth/mobile/refresh', body: { refreshToken: 'old-refresh' } }),
      (e: unknown) => e instanceof ApiError && e.code === 'TOKEN_REVOKED',
    );
    // Only one call — no infinite loop.
    assert.equal(calls.length, 1);
    // Storage NOT cleared by this path — the caller manages refresh-endpoint failures explicitly.
    assert.equal(storage.cleared, 0);
  });

  it('propagates non-401 errors as ApiError with status', async () => {
    const storage = makeStorage({
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: 900,
    });
    const t = bearerTransport({ baseUrl, storage });

    responses.push({ status: 400, body: { error: { code: 'VALIDATION_FAILED', message: 'bad' } } });

    await assert.rejects(
      () => t.request({ method: 'PATCH', path: '/users/me', body: { displayName: '' } }),
      (e: unknown) =>
        e instanceof ApiError && e.code === 'VALIDATION_FAILED' && e.status === 400,
    );
  });
});
