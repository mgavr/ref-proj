import { z } from 'zod';

/**
 * Environment variable schema. Validated at app bootstrap; the process
 * exits with a readable error if anything is missing or malformed.
 *
 * Add new vars here as the API grows \u2014 this is the single place env
 * shape is defined.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),

  /**
   * UUID of the user the FakeAuthGuard treats as "currently logged in"
   * when no X-Fake-User-Id header is sent. Set to the seeded developer
   * user's UUID in dev. Removed when real auth lands (step 4).
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
