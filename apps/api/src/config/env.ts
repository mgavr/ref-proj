import { z } from 'zod';

/**
 * Environment variable schema. Validated at app bootstrap; the process
 * exits with a readable error if anything is missing or malformed.
 *
 * Add new vars here as the API grows — this is the single place env
 * shape is defined.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),

  // ---- API public URL ------------------------------------------------
  // The URL where this API is reachable from the public internet — i.e.
  // the URL we register with OAuth providers as their redirect_uri.
  // In dev/Codespaces this is the port-3000 forwarded URL. In production
  // this is your API domain (e.g. https://api.refproj.example).
  // Used to build GoogleOAuthService.redirectUri.
  API_PUBLIC_URL: z.string().url(),

  // ---- Web origin -----------------------------------------------------
  // The URL of the web frontend that hosts the login page and that we
  // redirect users back to after a successful OAuth callback. Different
  // from API_PUBLIC_URL: this is where the user lands after we set
  // session cookies. Used for the 302 at the end of the callback handler
  // and as the CORS origin.
  WEB_ORIGIN: z.string().url(),

  // ---- Cookies --------------------------------------------------------
  // The Domain attribute on our session cookies. Leave empty to default
  // to "host-only" (the exact host the cookie was set from), which is
  // what we want in Codespaces and locally. In production with web and
  // API on separate subdomains of the same eTLD+1 (e.g. web.refproj.example
  // and api.refproj.example), set this to `.refproj.example`.
  COOKIE_DOMAIN: z.string().optional(),

  // ---- JWT ------------------------------------------------------------
  // Symmetric secrets for signing access and refresh tokens. Rotate
  // quarterly in production. The dev defaults in .env.example are
  // throwaway — never use them outside dev.
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),         // 15 min
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2592000),    // 30 days

  // ---- Google OAuth ---------------------------------------------------
  // GOOGLE_CLIENT_ID is the Web OAuth client. It's used for the web
  // login flow (server-side authorization-code exchange with a secret)
  // AND as one of the accepted audiences when verifying mobile ID
  // tokens (since the original Expo Go path used the Web client).
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  // GOOGLE_IOS_CLIENT_ID is the iOS OAuth client. Native apps using a
  // custom URL scheme can't use the Web client (Google doesn't allow
  // custom-scheme redirects on Web clients), so we register a separate
  // iOS client with the app's bundle ID. ID tokens issued for the iOS
  // client have it as their `aud` claim, so verifyIdToken accepts
  // either client ID. Optional: if unset, only Web-client tokens are
  // accepted (useful when iOS isn't deployed yet).
  GOOGLE_IOS_CLIENT_ID: z.string().min(1).optional(),

  // ---- Dev only -------------------------------------------------------
  /**
   * UUID of the user the FakeAuthGuard treats as "currently logged in"
   * when no X-Fake-User-Id header is sent. Set to the seeded developer
   * user's UUID in dev.
   *
   * Kept around in step 4a alongside the real JwtAuthGuard for debugging,
   * but no routes use FakeAuthGuard anymore. Remove in step 4b or later.
   */
  DEV_FAKE_USER_ID: z.string().uuid().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

/**
 * Parse process.env once at boot. Returns the validated, typed env.
 * Caches so re-reads are free.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error('[config] invalid environment:');
    for (const issue of result.error.issues) {
      // eslint-disable-next-line no-console
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  cached = result.data;
  return cached;
}
