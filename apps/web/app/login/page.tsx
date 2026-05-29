import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { GoogleIcon } from '@/components/google-icon';
import { Logo } from '@/components/logo';

/**
 * Login page — Linear-leaning aesthetic. Centered card on a cool gray
 * page surface, dense composition, indigo accent reserved for the
 * brand mark only. The primary action is a dark button — the inverse
 * of the editorial-serif version we replaced.
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
      <div className="w-full max-w-[360px] animate-fade-in">
        <div className="rounded-lg border border-hairline bg-surface px-7 py-7">
          <div className="mb-7">
            <Logo />
          </div>

          <h1 className="text-[20px] font-medium tracking-tighter leading-[1.2] text-ink">
            Sign in to your account
          </h1>
          <p className="mt-1.5 text-[13px] leading-[1.5] text-ink-muted">
            Continue with Google to access your dashboard.
          </p>

          <a
            href={apiStartUrl}
            className="
              mt-6 inline-flex w-full items-center justify-center gap-2
              rounded-md bg-ink px-3.5 py-2.5
              text-[13px] font-medium text-white
              transition-colors duration-150
              hover:bg-[#1a1e24]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface
              active:scale-[0.98]
            "
          >
            {/* Small white-backed Google icon inside the dark button.
                The 4-color G logo on a 12px white square keeps Google's
                brand guidelines intact while reading as part of the
                button. */}
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-[2px] bg-white p-[1px]">
              <GoogleIcon className="h-full w-full" />
            </span>
            Continue with Google
          </a>

          {errorCode ? (
            <div className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2">
              <p className="font-mono text-[11px] text-danger">
                error: {errorCode}
              </p>
            </div>
          ) : null}

          <p className="mt-5 text-center text-[12px] leading-[1.5] text-ink-faint">
            By signing in, you agree to our terms.
          </p>
        </div>

        <p className="mt-4 text-center text-[12px] text-ink-faint">
          New here? An account is created automatically on first sign-in.
        </p>
      </div>

      <footer className="pb-5 font-mono text-[11px] tracking-wide text-ink-faint">
        ref-proj · auth reference
      </footer>
    </div>
  );
}
