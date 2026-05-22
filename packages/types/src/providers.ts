import { z } from 'zod';

/**
 * The set of OAuth providers supported by ref-proj.
 *
 * Used everywhere a provider name appears: the `identities.provider` DB
 * column, the `/auth/:provider/start` URL parameter, and the mobile
 * verify endpoint's request body.
 */
export const OAuthProvider = z.enum(['google', 'facebook', 'github']);
export type OAuthProvider = z.infer<typeof OAuthProvider>;

export const OAUTH_PROVIDERS: ReadonlyArray<OAuthProvider> = OAuthProvider.options;
