import { redirect } from 'next/navigation';
import Image from 'next/image';
import { ApiError } from '@refproj/api-client';
import { getServerApiClient } from '@/lib/api';
import { LogoutButton } from './logout-button';

/**
 * The signed-in user's account page. Server component: fetches /users/me
 * during the SSR pass via the shared API client. If the session is
 * missing or expired, redirects to /login.
 */
export default async function AccountPage(): Promise<React.JSX.Element> {
  const client = await getServerApiClient();

  let user;
  try {
    user = await client.users.me();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect('/login');
    }
    throw err;
  }

  const createdAt = new Date(user.createdAt);
  const createdAtFormatted = createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="grid min-h-screen grid-rows-[1fr_auto] px-6">
      <div className="mx-auto w-full max-w-md self-center animate-slide-up">
        {/* Eyebrow — the small mono label that anchors the card */}
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted dark:text-ink-dark-muted">
          authenticated account
        </p>

        {/* The serif heading is the moment of personality. */}
        <h1 className="mt-3 font-display text-[clamp(2.75rem,7vw,4rem)] leading-[1] tracking-tight">
          Welcome,
          <br />
          <span className="italic">{firstName(user.displayName)}</span>.
        </h1>

        <div className="mt-8 h-px bg-rule dark:bg-rule-dark" />

        {/* Identity card */}
        <div className="mt-8 flex items-start gap-5">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={`${user.displayName}'s avatar`}
              width={64}
              height={64}
              className="rounded-full border border-rule dark:border-rule-dark"
              unoptimized
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark">
              <span className="font-display text-2xl italic text-ink-subtle dark:text-ink-dark-subtle">
                {initial(user.displayName)}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1 pt-1">
            <p className="font-sans text-base font-medium truncate">
              {user.displayName}
            </p>
            <p className="mt-0.5 font-mono text-xs text-ink-subtle dark:text-ink-dark-subtle truncate">
              {user.email}
            </p>
          </div>
        </div>

        {/* Metadata block — set in mono to underline that this is system
            data, not user-supplied content. */}
        <dl className="mt-10 space-y-3 font-mono text-xs">
          <div className="flex justify-between gap-4 border-b border-rule/50 dark:border-rule-dark/50 pb-2">
            <dt className="text-ink-muted dark:text-ink-dark-muted">id</dt>
            <dd className="truncate text-right text-ink-subtle dark:text-ink-dark-subtle">
              {user.id}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted dark:text-ink-dark-muted">member since</dt>
            <dd className="text-right text-ink-subtle dark:text-ink-dark-subtle">
              {createdAtFormatted}
            </dd>
          </div>
        </dl>

        <div className="mt-12">
          <LogoutButton />
        </div>
      </div>

      <footer className="pb-6 font-mono text-[11px] tracking-wide text-ink-muted dark:text-ink-dark-muted text-center">
        ref-proj &nbsp;·&nbsp; auth reference
      </footer>
    </div>
  );
}

function firstName(displayName: string): string {
  return displayName.split(/\s+/)[0] ?? displayName;
}

function initial(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase();
}
