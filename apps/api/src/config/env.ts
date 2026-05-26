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

  // ---- Web origin -----------------------------------------------------
  // The URL the OAuth callback redirects back to after a successful login.
  // In dev (no Next.js yet) this points at the API itself; we serve a
  // tiny placeholder landing page at GET /. Once the Next.js web frontend
  // lands, this becomes the Next.js URL.
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
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

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
