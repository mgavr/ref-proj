import { NextResponse, type NextRequest } from 'next/server';

/**
 * Cheap session check before /account renders. We only check cookie
 * *presence* — the API is the source of truth for validity, and the
 * server component on /account handles real 401 by redirecting too.
 * This middleware is just a fast-path to avoid SSR for users who
 * obviously have no session.
 */
export function middleware(req: NextRequest): NextResponse | undefined {
  const path = req.nextUrl.pathname;

  if (path.startsWith('/account')) {
    if (!req.cookies.has('refproj_access')) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return undefined;
}

export const config = {
  matcher: ['/account/:path*'],
};
