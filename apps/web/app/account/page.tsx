import { redirect } from 'next/navigation';
import Image from 'next/image';
import { ApiError } from '@refproj/api-client';
import { Logo } from '@/components/logo';
import { getServerApiClient } from '@/lib/api';
import { LogoutButton } from './logout-button';

/**
 * Account page — the authenticated counterpart to /login. Same card
 * vocabulary: cool gray page, white surface, hairline borders, dense
 * dark type. Avatar + name + email + system metadata, with a quiet
 * sign-out link at the bottom.
 *
 * Server component: fetches /users/me via the shared API client, which
 * forwards request cookies through Next.js's proxy to the API.
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

  const createdAt = new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="grid min-h-screen grid-rows-[1fr_auto] place-items-center px-6">
      <div className="w-full max-w-[440px] animate-slide-up">
        {/* Top brand row, separate from the card. Helps the card feel
            like content rather than the whole world. */}
        <div className="mb-5">
          <Logo />
        </div>

        <div className="rounded-lg border border-hairline bg-surface">
          {/* Header row inside the card: avatar + name + email. */}
          <div className="flex items-center gap-3.5 border-b border-hairline px-6 py-5">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt=""
                width={44}
                height={44}
                className="rounded-full border border-hairline"
                unoptimized
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft">
                <span className="text-[15px] font-medium text-accent">
                  {initial(user.displayName)}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium leading-tight text-ink">
                {user.displayName}
              </p>
              <p className="mt-0.5 truncate text-[12px] leading-tight text-ink-muted">
                {user.email}
              </p>
            </div>
            {/* Tiny status pill — establishes that this is an
                authenticated session, in the dense system style. */}
            <span className="flex items-center gap-1.5 rounded-md bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Active
            </span>
          </div>

          {/* Metadata rows. The whole table is mono — these are system
              values, not user-supplied content. */}
          <dl className="divide-y divide-hairline">
            <div className="flex items-center justify-between px-6 py-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                User ID
              </dt>
              <dd className="truncate pl-4 font-mono text-[12px] text-ink-muted">
                {user.id}
              </dd>
            </div>
            <div className="flex items-center justify-between px-6 py-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                Member since
              </dt>
              <dd className="font-mono text-[12px] text-ink-muted">
                {createdAt}
              </dd>
            </div>
            <div className="flex items-center justify-between px-6 py-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                Provider
              </dt>
              <dd className="font-mono text-[12px] text-ink-muted">google</dd>
            </div>
          </dl>

          {/* Footer of the card with the sign-out action. Quiet button —
              the destructive action shouldn't be the visual loudest
              thing on the page. */}
          <div className="flex items-center justify-between border-t border-hairline px-6 py-4">
            <p className="text-[12px] text-ink-muted">
              Welcome back, {firstName(user.displayName)}.
            </p>
            <LogoutButton />
          </div>
        </div>
      </div>

      <footer className="pb-5 font-mono text-[11px] tracking-wide text-ink-faint">
        ref-proj · auth reference
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
