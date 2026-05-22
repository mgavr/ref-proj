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

Spec locked in. Implementation has not started yet — see SPEC.md §14 for the planned build order.
