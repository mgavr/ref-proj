import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { GoogleIcon } from '@/components/google-icon';

/**
 * Login page. The "Sign in with Google" button is a plain anchor that
 * does a top-level navigation to the API's OAuth start endpoint —
 * exactly the flow we proved out in step 4a. No JS needed for the
 * redirect.
 *
 * If a session cookie is already present, redirect straight to /account.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>;
}): Promise<React.JSX.Element> {
  const jar = await cookies();
  if (jar.has('refproj_access')) {
    redirect('/account');
  }

  const params = await searchParams;
  const errorCode = params.auth_error;
  const apiStartUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/auth/google/start`;

  return (
    <div className="grid min-h-screen grid-rows-[1fr_auto] place-items-center px-6">
      <div className="w-full max-w-md animate-fade-in">
        {/* The heading deliberately overflows the apparent card edge —
            asymmetric, editorial. */}
        <h1 className="font-display text-[clamp(3.5rem,9vw,5rem)] leading-[0.95] tracking-tight -ml-[0.05em]">
          <span className="block italic">ref&#8202;-&#8202;proj</span>
        </h1>

        {/* Single hairline divider, the only "structure" on the page. */}
        <div className="mt-7 mb-6 h-px bg-rule dark:bg-rule-dark" />

        <p className="font-sans text-[0.95rem] leading-relaxed text-ink-subtle dark:text-ink-dark-subtle max-w-sm">
          A reference project establishing the patterns Karaoke Place and
          Prompt Bout will inherit. Sign in to view your account.
        </p>

        <a
          href={apiStartUrl}
          className="
            mt-10 inline-flex w-full items-center justify-center gap-3
            rounded-md border border-ink/15 dark:border-ink-dark/15
            bg-canvas dark:bg-canvas-dark
            px-5 py-3.5
            font-sans text-[0.95rem] font-medium
            shadow-[0_1px_0_0_rgba(26,24,22,0.04)]
            transition-all duration-200
            hover:border-ink/30 dark:hover:border-ink-dark/30
            hover:shadow-[0_4px_16px_-4px_rgba(26,24,22,0.12)]
            hover:-translate-y-px
            active:translate-y-0 active:shadow-none
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
          "
        >
          <GoogleIcon className="h-5 w-5" />
          <span>Sign in with Google</span>
        </a>

        {errorCode ? (
          <p className="mt-6 font-mono text-xs text-accent dark:text-accent-dark">
            error: {errorCode}
          </p>
        ) : null}
      </div>

      {/* Footer — minimal. The mono font in the corner signals "this is
          a technical artifact" without being noisy. */}
      <footer className="pb-6 font-mono text-[11px] tracking-wide text-ink-muted dark:text-ink-dark-muted">
        ref-proj &nbsp;·&nbsp; auth reference
      </footer>
    </div>
  );
}
