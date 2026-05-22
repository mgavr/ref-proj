import { z } from 'zod';

/**
 * Stable error codes the API may return. Clients can branch on these
 * without parsing English messages. Add new codes as the API grows; do
 * not rename existing ones \u2014 they're part of the public contract.
 */
export const ApiErrorCode = z.enum([
  // 400 family
  'BAD_REQUEST',
  'VALIDATION_FAILED',
  // 401 family
  'UNAUTHENTICATED',
  'TOKEN_EXPIRED',
  'TOKEN_INVALID',
  'TOKEN_REVOKED',
  // 403 family
  'FORBIDDEN',
  // 404 family
  'NOT_FOUND',
  // 409 family
  'CONFLICT',
  // 429
  'RATE_LIMITED',
  // 500 family
  'INTERNAL_ERROR',
  // OAuth-specific
  'OAUTH_STATE_INVALID',
  'OAUTH_PROVIDER_ERROR',
  'OAUTH_PROVIDER_TOKEN_INVALID',
]);

export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

/**
 * The error envelope every non-2xx response wraps content in.
 * Per SPEC.md \u00a76 ("Global exception filter returning {error: {code, message, details?}}").
 *
 * `message` is human-readable, English, and may change \u2014 do not branch on it.
 * `code` is stable. `details` is open-ended structured context (e.g. Zod issues).
 */
export const ApiErrorBody = z.object({
  error: z.object({
    code: ApiErrorCode,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ApiErrorBody = z.infer<typeof ApiErrorBody>;
