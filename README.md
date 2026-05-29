# ref-proj

Reference project establishing the patterns used by Karaoke Place (kara.bar) and Prompt Bout.

A minimal full-stack application where users sign in with Google and see only their own account.

## Stack

- **Backend** — NestJS + PostgreSQL (Prisma)
- **Web** — Next.js (App Router)
- **Mobile** — React Native (Expo)
- **Auth** — Hybrid OAuth: server-side for web (httpOnly cookies), client-side ID-token verification for mobile (JWT in SecureStore)
- **Monorepo** — pnpm + Turborepo
- **Deployment** — DigitalOcean App Platform (backend + Postgres), Vercel (web), Expo EAS (mobile)

See [SPEC.md](./SPEC.md) for the complete specification, decisions, data model, and build order.

## Status

Spec locked in. Implementation in progress — see SPEC.md §14 for the planned build order.

## Development options

You can develop in a cloud environment (recommended — nothing to install on your machine) or locally with Docker. Pick one.

### Option A: GitHub Codespaces (recommended)

1. On the repo page, click **Code → Codespaces → Create codespace on main**.
2. Wait for the container to build (~2 minutes first time, ~30s after).
3. Inside the Codespace terminal:

   ```bash
   # First time only:
   pnpm db:up                 # start Postgres
   pnpm db:migrate            # apply the committed init migration
   pnpm db:seed               # create the developer fake user

   # Every session:
   pnpm db:up
   pnpm --filter @refproj/api dev
   ```

4. Codespaces forwards port 3000 automatically; the Ports tab shows a public URL you can curl from anywhere (including your phone).

The devcontainer config (`.devcontainer/devcontainer.json`) installs Node 22, pnpm, Docker-in-Docker, and the relevant VS Code extensions. It runs `pnpm install` (which triggers `prisma generate` via the API's `postinstall`) and copies `.env.example` to `.env` on creation, so you land in a ready-to-use state.

> **If `pnpm db:seed` ever complains that `@prisma/client did not initialize yet`,** run `pnpm --filter @refproj/api db:generate` and try again. The `postinstall` hook normally handles this, but if you ran `pnpm install --ignore-scripts` (or skipped install entirely) the generated client won't exist yet.

### Option B: Local development

Prereqs: Node 22, pnpm 9, Docker.

```bash
pnpm install                 # runs `prisma generate` via postinstall
pnpm db:up                   # start Postgres in Docker
cp apps/api/.env.example apps/api/.env
pnpm db:migrate              # first time only \u2014 apply the committed init migration
pnpm db:seed                 # first time only \u2014 create the dev user
pnpm --filter @refproj/api dev
```

### Endpoints

Once the API is running on http://localhost:3000:

- `GET /healthz` — liveness + db check
- `GET /api/v1/auth/_debug` — debug landing page for exercising the auth flow without the web frontend
- `GET /api/v1/auth/google/start` — begins Google OAuth (redirects to Google)
- `GET /api/v1/auth/google/callback` — Google redirects here; on success, sets session cookies and redirects to `WEB_ORIGIN`
- `POST /api/v1/auth/mobile/verify` — mobile: exchange a Google ID token for a session (returns tokens as JSON)
- `POST /api/v1/auth/refresh` — web: rotates the refresh token (reads cookie, sets new cookies)
- `POST /api/v1/auth/mobile/refresh` — mobile: rotates the refresh token (reads body, returns JSON)
- `POST /api/v1/auth/logout` — web: revokes the refresh-token family and clears cookies
- `POST /api/v1/auth/mobile/logout` — mobile: revokes the refresh-token family (reads body)
- `GET /api/v1/users/me` — returns the currently-authenticated user (requires session)
- `PATCH /api/v1/users/me` — updates display name
- `DELETE /api/v1/users/me` — deletes the user

### Trying the auth flow in dev

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `API_PUBLIC_URL`, and `WEB_ORIGIN` in `apps/api/.env` (see comments in `.env.example`). The two URLs are different:

- `API_PUBLIC_URL` (port 3000) — the API's own URL; what Google calls back. Must match the redirect URI registered in Google Cloud Console.
- `WEB_ORIGIN` (port 3001) — where users land after a successful OAuth callback.

And `NEXT_PUBLIC_API_BASE_URL` in `apps/web/.env.local` must point at the same place as `API_PUBLIC_URL`, with the `/api/v1` suffix.

Run both apps in separate terminals:

```bash
pnpm --filter @refproj/api dev    # API on :3000
pnpm --filter @refproj/web dev    # Web on :3001
```

In Codespaces, make sure both ports 3000 (API) and 3001 (Web) are set to **Public** visibility so Google's redirect can reach the callback and your browser can reach the web app. Open the port-3001 URL and click "Sign in with Google".

If you just want to test the API auth flow without running the web app, hit `GET /api/v1/auth/_debug` on port 3000 instead.
