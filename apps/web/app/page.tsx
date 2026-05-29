import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Root route. We don't render a landing page in the reference project —
 * just bounce to /account (if cookie present) or /login (if not). The
 * middleware does this for /account too, so this route exists mainly
 * so users hitting the bare URL have somewhere to go.
 */
export default async function Home(): Promise<never> {
  const jar = await cookies();
  const hasSession = jar.has('refproj_access');
  redirect(hasSession ? '/account' : '/login');
}
