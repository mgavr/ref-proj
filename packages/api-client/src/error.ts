import type { ApiErrorBody, ApiErrorCode } from '@refproj/types';

/**
 * Single error class thrown by every endpoint method.
 *
 * Carries the structured fields the API guarantees via its global
 * exception filter (see SPEC.md §6, apps/api/src/common/exception.filter.ts):
 *
 *   - `code`    stable enum, safe to branch on
 *   - `message` human-readable English, do not branch on
 *   - `status`  HTTP status code from the response
 *   - `details` optional structured context (Zod issues, etc.)
 *
 * Use `code` for behavior:
 *   try { await client.users.me(); }
 *   catch (e) {
 *     if (e instanceof ApiError && e.code === 'UNAUTHENTICATED') redirectToLogin();
 *     else throw e;
 *   }
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(args: {
    code: ApiErrorCode;
    message: string;
    status: number;
    details?: unknown;
  }) {
    super(args.message);
    this.name = 'ApiError';
    this.code = args.code;
    this.status = args.status;
    this.details = args.details;
  }
}

/**
 * Construct an ApiError from a fetch Response. Used by transports
 * after they detect a non-2xx response.
 *
 * Tries to parse the body as the standard ApiErrorBody envelope.
 * If the body is malformed (e.g. an upstream proxy returned a
 * different error format), falls back to a generic INTERNAL_ERROR
 * with the response status preserved.
 */
export async function apiErrorFromResponse(res: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;
  try {
    body = (await res.json()) as ApiErrorBody;
  } catch {
    // Not JSON, or empty body.
  }

  if (body?.error?.code && body?.error?.message) {
    return new ApiError({
      code: body.error.code,
      message: body.error.message,
      status: res.status,
      details: body.error.details,
    });
  }

  return new ApiError({
    code: 'INTERNAL_ERROR',
    message: `HTTP ${res.status} (no error body)`,
    status: res.status,
  });
}
