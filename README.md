# ref-proj

Reference project establishing the patterns used by Karaoke Place (kara.bar) and Prompt Bout.

A minimal full-stack application where users sign in with Google, Facebook, or GitHub and see only their own account.

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
   pnpm db:up
   pnpm db:migrate:new init   # creates the initial migration
   pnpm db:seed

   # Every session:
   pnpm db:up
   pnpm --filter @refproj/api dev
   ```

4. Codespaces forwards port 3000 automatically; the Ports tab shows a public URL you can curl from anywhere (including your phone).

The devcontainer config (`.devcontainer/devcontainer.json`) installs Node 22, pnpm, Docker-in-Docker, and the relevant VS Code extensions. It runs `pnpm install` and copies `.env.example` to `.env` on creation, so you land in a ready-to-use state.

### Option B: Local development

Prereqs: Node 22, pnpm 9, Docker.

```bash
pnpm install
pnpm db:up
cp apps/api/.env.example apps/api/.env
pnpm db:migrate:new init   # first time only
pnpm db:seed               # first time only
pnpm --filter @refproj/api dev
```

### Endpoints

Once the API is running on http://localhost:3000:

- `GET /healthz` — liveness + db check
- `GET /api/v1/users/me` — the fake-guarded "current user" endpoint (returns the seeded developer user)
