import { z } from 'zod';

/**
 * The set of OAuth providers supported by ref-proj.
 *
 * Currently single-valued (`google`). Kept as an enum rather than a
 * literal so adding `facebook`, `github`, etc. later is a one-line
 * change here plus a Prisma enum migration \u2014 no consumer-side rewrites.
 *
 * Used everywhere a provider name appears: the `identities.provider` DB
 * column, the `/auth/:provider/start` URL parameter, and the mobile
 * verify endpoint's request body.
 */
export const OAuthProvider = z.enum(['google']);
export type OAuthProvider = z.infer<typeof OAuthProvider>;

export const OAUTH_PROVIDERS: ReadonlyArray<OAuthProvider> = OAuthProvider.options;
