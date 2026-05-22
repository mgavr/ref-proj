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

## First-run setup

Prereqs: Node 22, pnpm 9, Docker.

```bash
# 1. Install all workspace deps
pnpm install

# 2. Start Postgres (Docker Compose)
pnpm db:up

# 3. Bootstrap the API's database
cp apps/api/.env.example apps/api/.env
pnpm db:migrate    # apply migrations
pnpm db:seed       # create the dev fake user

# 4. Run the API in watch mode
pnpm --filter @refproj/api dev
```

The API will be on http://localhost:3000.

- `GET /healthz` — liveness + db check
- `GET /api/v1/users/me` — the fake-guarded "current user" endpoint

`pnpm db:up` runs Postgres in the background (`pnpm db:down` to stop, `pnpm db:reset` to wipe). The API's dev script runs `prisma migrate deploy` on startup, so newly-pulled migrations are applied automatically; creating a *new* migration is still an explicit `pnpm db:migrate:new <name>`.
