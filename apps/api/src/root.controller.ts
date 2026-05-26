import { Controller, Get, Header, Inject } from '@nestjs/common';
import { ENV } from './config/config.module';
import type { Env } from './config/env';

/**
 * Placeholder landing page served by the API. Three buttons let you
 * exercise the auth flow end-to-end before the real Next.js frontend
 * lands. Replaced wholesale in step 6.
 */
@Controller('/')
export class RootController {
  constructor(@Inject(ENV) private readonly env: Env) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  index(): string {
    return /* html */ `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ref-proj (dev)</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root { color-scheme: light dark; }
      body { font-family: system-ui, sans-serif; max-width: 640px; margin: 4rem auto; padding: 0 1rem; }
      h1 { margin-bottom: 0.25rem; }
      .sub { opacity: 0.7; margin-top: 0; }
      .row { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.5rem; }
      a.button, button {
        font: inherit; padding: 0.5rem 1rem; border-radius: 6px;
        border: 1px solid currentColor; background: transparent;
        color: inherit; cursor: pointer; text-decoration: none;
      }
      pre { background: rgba(127,127,127,0.1); padding: 1rem; border-radius: 6px; overflow-x: auto; }
      .err { color: #c00; }
    </style>
  </head>
  <body>
    <h1>ref-proj</h1>
    <p class="sub">Step 4a placeholder. Real Next.js frontend lands in step 6.</p>
    <div class="row">
      <a class="button" href="/api/v1/auth/google/start">Sign in with Google</a>
      <button id="me">Show me</button>
      <button id="logout">Logout</button>
    </div>
    <pre id="out">(click "Show me" after signing in)</pre>
    <script>
      const out = document.getElementById('out');
      const url = new URL(location.href);
      const err = url.searchParams.get('auth_error');
      if (err) {
        out.classList.add('err');
        out.textContent = 'auth_error: ' + err;
      }
      document.getElementById('me').onclick = async () => {
        out.classList.remove('err');
        out.textContent = 'loading...';
        try {
          const res = await fetch('/api/v1/users/me', { credentials: 'include' });
          const json = await res.json();
          out.textContent = JSON.stringify(json, null, 2) + '\\n(HTTP ' + res.status + ')';
          if (!res.ok) out.classList.add('err');
        } catch (e) {
          out.classList.add('err');
          out.textContent = String(e);
        }
      };
      document.getElementById('logout').onclick = async () => {
        out.classList.remove('err');
        out.textContent = 'logging out...';
        try {
          const res = await fetch('/api/v1/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });
          out.textContent = 'logged out (HTTP ' + res.status + ')';
        } catch (e) {
          out.classList.add('err');
          out.textContent = String(e);
        }
      };
    </script>
  </body>
</html>`;
  }
}
