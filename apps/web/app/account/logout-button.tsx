'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Logout button. POSTs to /auth/logout, then navigates to /login.
 * Done client-side so the cookie clear (which arrives in the response
 * Set-Cookie header) is observed by the browser before we navigate.
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
      // Even if the API call fails, we proceed to /login —
      // the user wanted out.
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
        group inline-flex items-center gap-2
        font-sans text-sm font-medium
        text-ink dark:text-ink-dark
        transition-opacity
        hover:opacity-100 disabled:opacity-50
        focus-visible:outline-none
      "
    >
      <span className="border-b border-current opacity-60 group-hover:opacity-100 transition-opacity">
        {pending ? 'signing out' : 'sign out'}
      </span>
      <span aria-hidden className="font-mono opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
        →
      </span>
    </button>
  );
}
