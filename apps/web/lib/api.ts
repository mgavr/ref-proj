import { cookies } from 'next/headers';
import {
  ApiError,
  createApiClient,
  type ApiClient,
  type Transport,
  type TransportRequest,
} from '@refproj/api-client';

/**
 * Server-side API client. Used by server components and route handlers.
 *
 * We can't use the regular cookieTransport here because that relies on
 * `credentials: 'include'` and a browser-managed cookie jar — neither
 * applies on the server. Instead we forward the incoming request's
 * cookies explicitly via the Cookie header.
 *
 * Constructed per-request, since cookies() must be called inside the
 * request scope.
 */
export async function getServerApiClient(): Promise<ApiClient> {
  const jar = await cookies();
  const cookieHeader = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1';

  const transport: Transport = {
    async request<T>(req: TransportRequest): Promise<T | null> {
      const res = await fetch(`${baseUrl}${req.path}`, {
        method: req.method,
        headers: {
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          ...(req.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
        // No `credentials` field needed for server-side fetch; we set
        // the Cookie header explicitly above.
        cache: 'no-store',
      });

      if (!res.ok) {
        let body: { error?: { code?: string; message?: string; details?: unknown } } | null = null;
        try {
          body = await res.json();
        } catch {
          // not JSON
        }
        throw new ApiError({
          code: (body?.error?.code ?? 'INTERNAL_ERROR') as never,
          message: body?.error?.message ?? `HTTP ${res.status}`,
          status: res.status,
          details: body?.error?.details,
        });
      }
      if (res.status === 204) return null;
      return (await res.json()) as T;
    },
  };

  return createApiClient({ baseUrl, transport });
}
