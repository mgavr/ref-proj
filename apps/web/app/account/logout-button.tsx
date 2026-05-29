'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Logout button. POSTs to /auth/logout, then navigates to /login.
 * Done client-side so the cookie clear (which arrives in the response
 * Set-Cookie header) is observed by the browser before we navigate.
 *
 * Style: secondary outlined — visually quieter than a primary button.
 * The destructive action isn't supposed to grab the eye.
 */
export function LogoutButton(): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick(): Promise<void> {
    if (pending) return;
    setPending(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
      await fetch(`${apiBase}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Even if the API call fails, proceed to /login — the user
      // wanted out.
    }
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="
        inline-flex items-center gap-1.5
        rounded-md border border-hairline bg-surface px-2.5 py-1.5
        text-[12px] font-medium text-ink
        transition-colors duration-150
        hover:border-hairlineStrong hover:bg-page
        disabled:opacity-50 disabled:cursor-not-allowed
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-surface
      "
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
