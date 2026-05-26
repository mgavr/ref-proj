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
- `GET /api/v1/users/me` — the fake-guarded "current user" endpoint (returns the seeded developer user)
