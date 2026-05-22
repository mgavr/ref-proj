/**
 * Seed the dev database with the fake user used by the FakeAuthGuard.
 *
 * Idempotent: safe to re-run. The user's UUID is stable so it can be
 * referenced from .env.example without surprise.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEV_FAKE_USER_ID = '00000000-0000-4000-8000-000000000001';

async function main(): Promise<void> {
  const user = await prisma.user.upsert({
    where: { id: DEV_FAKE_USER_ID },
    create: {
      id: DEV_FAKE_USER_ID,
      email: 'developer@local.test',
      displayName: 'Local Developer',
      avatarUrl: null,
    },
    update: {},
  });
  // eslint-disable-next-line no-console
  console.log(`[seed] dev user ready: ${user.email} (${user.id})`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seed] failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
