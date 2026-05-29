import { Controller, Get, Header } from '@nestjs/common';

/**
 * Debug page kept for testing the auth flow without a frontend. Moved
 * here in step 6 from `/` after the real Next.js frontend took over.
 * Available at GET /api/v1/auth/_debug. Useful when iterating on auth
 * changes — you don't have to spin up the web app to hit the flow.
 */
@Controller('auth/_debug')
export class RootController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  index(): string {
    return /* html */ `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ref-proj auth debug</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root { color-scheme: light dark; }
      body { font-family: ui-monospace, SFMono-Regular, monospace; max-width: 640px; margin: 4rem auto; padding: 0 1rem; }
      h1 { font-size: 1rem; margin: 0 0 1rem; opacity: 0.6; }
      .row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
      a.button, button {
        font: inherit; padding: 0.4rem 0.8rem; border-radius: 4px;
        border: 1px solid currentColor; background: transparent;
        color: inherit; cursor: pointer; text-decoration: none;
      }
      pre { background: rgba(127,127,127,0.1); padding: 1rem; border-radius: 4px; overflow-x: auto; font-size: 0.85rem; }
      .err { color: #c00; }
    </style>
  </head>
  <body>
    <h1># ref-proj — auth debug</h1>
    <div class="row">
      <a class="button" href="/api/v1/auth/google/start">sign in (google)</a>
      <button id="me">/users/me</button>
      <button id="logout">/auth/logout</button>
    </div>
    <pre id="out">(click /users/me after signing in)</pre>
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
