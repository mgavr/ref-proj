# Reference Project Spec

A minimal full-stack project that establishes the patterns Karaoke Place (kara.bar) and Prompt Bout will inherit. Users sign in with Google and see only their own account.

> **Note on providers:** This started out with Google, Facebook, and GitHub. Facebook and GitHub were removed before step 4 to keep the reference project focused — three providers cost setup time but teach the same pattern as one. The `identities` table and the per-provider switching logic are deliberately kept so additional providers slot in with new credentials and one new file, no schema rewrite.

## Decisions locked in

| Area | Choice |
|---|---|
| Backend | Node.js + NestJS (TypeScript) |
| Database | PostgreSQL |
| Web frontend | Next.js (App Router, React) |
| Mobile frontend | React Native (Expo) |
| Auth flow | Hybrid: server-side OAuth for web, client-side ID-token verification for mobile |
| Identity providers | Google (Facebook and GitHub removed for simplicity \u2014 see note above) |
| Session — web | httpOnly cookies (access + refresh), CSRF via SameSite=Lax + double-submit token |
| Session — mobile | JWT access token in memory + refresh token in `expo-secure-store` |
| Refresh tokens | Rotated on every use, token-family tracking for theft detection |
| Shared code | API client + types package consumed by both web and mobile |
| Deployment | DigitalOcean App Platform (backend + managed Postgres), Vercel for web, Expo EAS for mobile builds |
| Domain | Placeholder `api.refproj.example` — swapped via env at deploy time |

---

## 1. High-level architecture

```
┌─────────────┐        ┌─────────────┐
│  Next.js    │        │ Expo (RN)   │
│  (web)      │        │ (mobile)    │
└──────┬──────┘        └──────┬──────┘
       │ cookies              │ Authorization: Bearer
       │ (httpOnly)           │
       └────────┬─────────────┘
                │
                ▼
       ┌────────────────┐         ┌──────────────────┐
       │  NestJS API    │◄────────│ Google OAuth     │
       │  (DO App Plat) │  OAuth  │ provider         │
       └────────┬───────┘         └──────────────────┘
                │
                ▼
       ┌────────────────┐
       │ Postgres       │
       │ (DO Managed)   │
       └────────────────┘
```

Three deployable units:

1. **`apps/api`** — NestJS backend, the only thing that talks to the database or to OAuth providers' server-side endpoints.
2. **`apps/web`** — Next.js app, talks to the API over HTTPS with cookies.
3. **`apps/mobile`** — Expo app, talks to the API with Bearer tokens.

Two shared library packages:

4. **`packages/api-client`** — typed fetch client, consumed by both `apps/web` and `apps/mobile`. Handles auth header injection, 401-triggered refresh, and platform differences (cookie credentials on web, secure storage on mobile) behind a single interface.
5. **`packages/types`** — shared DTOs and Zod schemas. Single source of truth for request/response shapes.

Monorepo using **pnpm workspaces** + **Turborepo** (or Nx if you prefer — Turborepo is lighter and the better default for this stack).

---

## 2. Repository layout

```
refproj/
├── apps/
│   ├── api/                  # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/         # OAuth strategies, JWT, refresh, guards
│   │   │   ├── users/        # User entity, /me endpoint
│   │   │   ├── common/       # filters, interceptors, decorators
│   │   │   ├── database/     # Prisma client wrapper, migrations
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── test/
│   │   └── Dockerfile
│   ├── web/                  # Next.js
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   ├── (app)/account/
│   │   │   └── api/auth/     # cookie-setting bounce route
│   │   ├── lib/
│   │   └── middleware.ts     # session enforcement
│   └── mobile/               # Expo
│       ├── app/              # expo-router
│       │   ├── (auth)/login.tsx
│       │   └── (app)/account.tsx
│       ├── lib/
│       │   ├── auth/         # expo-auth-session config per provider
│       │   └── storage.ts    # SecureStore wrapper
│       └── app.config.ts
├── packages/
│   ├── api-client/
│   │   ├── src/
│   │   │   ├── client.ts     # createApiClient({ transport })
│   │   │   ├── transports/   # cookie vs bearer
│   │   │   └── endpoints/    # one file per resource
│   │   └── package.json
│   └── types/
│       ├── src/
│       │   ├── auth.ts       # LoginResponse, RefreshResponse, etc.
│       │   └── user.ts       # User DTO, schemas
│       └── package.json
├── infra/
│   ├── do-app-platform/      # app.yaml spec
│   └── docker-compose.dev.yml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 3. Data model

Minimal — exactly what's needed for "user signs in, sees their account."

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | generated server-side |
| `email` | citext UNIQUE | normalized lowercase |
| `display_name` | text | from provider profile |
| `avatar_url` | text NULL | from provider profile |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | default now() |

### `identities` — one row per (user, provider) link

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | ON DELETE CASCADE |
| `provider` | enum('google') | currently single-provider; enum keeps the door open for more |
| `provider_user_id` | text | the `sub` / `id` from the provider |
| `email_at_link` | text | snapshot for audit |
| `created_at` | timestamptz | |

Unique constraint: `(provider, provider_user_id)`. Index on `user_id`.

This shape lets a single user link multiple providers later without schema changes — important because Karaoke Place and Prompt Bout will likely want account linking.

### `refresh_tokens` — rotation + theft detection

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | this *is* the refresh token's `jti` |
| `user_id` | uuid FK → users | |
| `family_id` | uuid | shared across rotations of the same login |
| `parent_id` | uuid NULL | the token this one rotated from |
| `token_hash` | text | SHA-256 of the actual token value |
| `expires_at` | timestamptz | |
| `revoked_at` | timestamptz NULL | |
| `replaced_by_id` | uuid NULL | the token that rotated this one |
| `user_agent` | text | for the user's "active sessions" view later |
| `ip` | inet | |

**Theft-detection rule:** if a refresh token is presented that has already been rotated (i.e., `replaced_by_id IS NOT NULL`), revoke the entire `family_id`. This is the OWASP-recommended pattern.

---

## 4. Auth flows

### 4.1 Web — server-side OAuth (Google, Facebook, GitHub)

```
1. User clicks "Sign in with Google" on /login
   → Next.js redirects to GET https://api.refproj.example/auth/google/start

2. Backend generates `state` + `pkce_verifier`, stores them in a short-lived
   signed cookie scoped to api.refproj.example, redirects to Google's OAuth URL.

3. Google → GET https://api.refproj.example/auth/google/callback?code=...&state=...

4. Backend:
   - Validates state cookie
   - Exchanges code for tokens (server-side, with client_secret)
   - Fetches userinfo
   - Upserts user + identity row
   - Issues access JWT (15min) + refresh token (30d, rotated)
   - Sets two httpOnly cookies on api.refproj.example:
       refproj_access  (Path=/, SameSite=Lax)
       refproj_refresh (Path=/auth/refresh, SameSite=Lax)
   - 302 redirects to https://web.refproj.example/account
```

For this to work, web and API must share an **eTLD+1** (e.g., `web.refproj.example` and `api.refproj.example` both under `refproj.example`) so the cookies are first-party. This is the only nontrivial DNS requirement — flag it loudly in the deployment guide.

CSRF: SameSite=Lax handles top-level navigations safely. For state-changing fetches from `web.refproj.example` to `api.refproj.example`, the API issues a `csrf_token` cookie (non-httpOnly, so JS can read it) and requires it echoed in an `X-CSRF-Token` header. Standard double-submit.

### 4.2 Mobile — client-side ID-token verification

```
1. User taps "Sign in with Google" on the login screen.
2. expo-auth-session opens the native auth UI, returns an ID token to the app.
3. App POSTs { provider: 'google', id_token: '...' } to
   https://api.refproj.example/auth/mobile/verify
4. Backend:
   - Fetches Google's JWKS (cached), verifies signature, iss, aud, exp
   - Upserts user + identity
   - Returns JSON: { access_token, refresh_token, user }
5. App stores refresh_token in expo-secure-store, access_token in memory.
6. All subsequent requests: Authorization: Bearer <access_token>
```

Per provider:

| Provider | Mobile SDK | What backend verifies |
|---|---|---|
| Google | `expo-auth-session/providers/google` | ID token (JWT) against Google's JWKS |

> **Adding a provider later.** The mobile verify endpoint takes a discriminated union by `provider`. With Google alone, the union has one branch. To add Facebook (access token via `graph.facebook.com/debug_token`) or GitHub (PKCE authorization code, server exchanges with client_secret), add a branch to the schema in `@refproj/types` and a `case` in the handler. No data-model change is needed \u2014 the `identities` table's `provider` enum just gets a new value via migration.

### 4.3 Refresh (both platforms)

```
POST /auth/refresh
  Web:    refresh token comes from refproj_refresh cookie
  Mobile: refresh token comes from request body

Backend:
  1. Look up token by hash
  2. If revoked OR already rotated → revoke entire family, return 401
  3. Otherwise: issue new pair, mark old as rotated (replaced_by_id = new.id)
  4. Return new pair (cookie set for web, JSON for mobile)
```

### 4.4 Logout

```
POST /auth/logout
  → revoke current refresh token's family
  → web: clear cookies
  → mobile: client deletes from SecureStore
```

---

## 5. API surface

All under `/api/v1`. Versioning from day one — Karaoke Place will want it.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/auth/:provider/start` | none | Web: begin OAuth |
| GET | `/auth/:provider/callback` | none | Web: complete OAuth, set cookies, redirect |
| POST | `/auth/mobile/verify` | none | Mobile: exchange provider token/code for session |
| POST | `/auth/refresh` | refresh | Rotate tokens |
| POST | `/auth/logout` | access | Revoke session |
| GET | `/users/me` | access | Return current user |
| PATCH | `/users/me` | access | Update display_name (just to prove writes work) |
| DELETE | `/users/me` | access | Delete account |

Everything else is out of scope for the reference project.

---

## 6. NestJS backend — concrete shape

**Modules**

- `AuthModule` — Passport strategy for Google (`passport-google-oauth20`), JWT module, refresh service, guards (`JwtAuthGuard`, `RefreshTokenGuard`). One file per provider; adding a second is additive.
- `UsersModule` — controller for `/users/me`, service over Prisma.
- `DatabaseModule` — `PrismaService` (global).
- `ConfigModule` — `@nestjs/config` with Zod-validated env schema.
- `HealthModule` — `/healthz` for App Platform's health checks.

**Cross-cutting**

- Global `ValidationPipe` with `class-validator` *or* a Zod pipe — recommend Zod since `packages/types` will use Zod schemas and you can share them end-to-end.
- Global exception filter returning `{ error: { code, message, details? } }`.
- `helmet`, `compression`, CORS configured per-environment (allow `web.refproj.example` in prod).
- Pino logger with request IDs.
- Rate limiting on `/auth/*` (e.g., `@nestjs/throttler`).

**Auth guard precedence:** check `Authorization: Bearer` header first; if absent, check `refproj_access` cookie. One guard, both transports.

**Migrations:** Prisma Migrate. Run on container startup via a small entrypoint script (acceptable at this scale; revisit if you ever need zero-downtime deploys).

---

## 7. Next.js web frontend — concrete shape

App Router. Three routes that matter:

- `/login` — one "Sign in with Google" button, a plain `<a href="https://api.refproj.example/auth/google/start">`. No JS needed for the redirect itself.
- `/account` — server component that calls `GET /users/me` via the shared API client, passing through the request cookies. If 401, redirect to `/login`.
- `/api/auth/callback-bounce` — *optional*, only needed if you decide later you want the cookie set on `web.refproj.example` instead of `api.refproj.example`. For the reference project we set cookies directly on the API domain and skip this.

**`middleware.ts`** — checks for the presence of `refproj_access` cookie on protected routes and redirects to `/login` if missing. Cheap, no DB hit. Real validity is checked by the API on each request.

**Logout** — POSTs to `/auth/logout`, then `router.push('/login')`.

---

## 8. Expo mobile frontend — concrete shape

Expo Router (file-based, same mental model as Next.js App Router).

- `app/(auth)/login.tsx` — one "Sign in with Google" button wired via `expo-auth-session`. Successful flow stores tokens and navigates to `/account`.
- `app/(app)/account.tsx` — fetches `/users/me`, shows email + display name + avatar + a Logout button.
- `app/_layout.tsx` — root layout reads SecureStore on mount, decides which group to redirect into.

**Token lifecycle**

- Access token kept in a React context (in-memory only, not persisted).
- Refresh token in SecureStore under a single key.
- Shared API client owns the 401 → refresh → retry loop. The mobile app only ever calls `client.users.me()` etc., never sees the tokens directly outside the auth bootstrap.

**App configuration**

- `app.config.ts` with EAS profiles for `development` (local API), `preview` (staging), and `production`.
- URL schemes for the Google OAuth redirect registered in the Google Cloud Console.

---

## 9. Shared API client (`packages/api-client`)

The single most important piece for "same patterns on web and mobile."

```ts
// Public API
const client = createApiClient({
  baseUrl: 'https://api.refproj.example/api/v1',
  transport: webTransport()      // or bearerTransport({ getTokens, setTokens })
});

await client.users.me();         // returns User, throws ApiError on non-2xx
await client.auth.logout();
```

**Transports** abstract the platform difference:

- `webTransport()` — adds `credentials: 'include'`, reads CSRF cookie, sets `X-CSRF-Token` header, never touches `Authorization`.
- `bearerTransport({ getTokens, setTokens })` — adds `Authorization`, handles refresh on 401 by calling `/auth/refresh` with the stored refresh token, retries the original request, and calls `setTokens` to persist new ones.

Everything above the transport layer (endpoint definitions, typed responses, error shape) is identical on both platforms.

---

## 10. Environment variables

**Backend (`apps/api`)**

```
DATABASE_URL=postgres://...
JWT_ACCESS_SECRET=...                    # rotate quarterly
JWT_REFRESH_SECRET=...
JWT_ACCESS_TTL=900                       # 15 min
JWT_REFRESH_TTL=2592000                  # 30 days
COOKIE_DOMAIN=.refproj.example
WEB_ORIGIN=https://web.refproj.example
MOBILE_REDIRECT_ALLOWLIST=refproj://auth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**Web (`apps/web`)**

```
NEXT_PUBLIC_API_BASE_URL=https://api.refproj.example/api/v1
NEXT_PUBLIC_AUTH_START_BASE=https://api.refproj.example/auth
```

**Mobile (`apps/mobile`)** — via Expo's `extra` config

```
apiBaseUrl=https://api.refproj.example/api/v1
googleClientId=...                       # iOS, Android, web variants
```

Provider client IDs *are* in the mobile bundle by necessity. That's fine — they're not secrets. Client *secrets* never leave the backend.

---

## 11. DigitalOcean deployment

**App Platform spec (`infra/do-app-platform/app.yaml`)** — declares:

- A service for `apps/api`: Dockerfile build, HTTP port 3000, health check on `/healthz`, autoscale 1–3.
- A managed Postgres database (dev tier is fine — $7/mo at the time of writing, but verify when you actually deploy).
- Environment variables and secrets referenced from App Platform's secret manager.
- A custom domain mapping `api.refproj.example` → the service, with TLS auto-provisioned.

**Web on Vercel.** Next.js on Vercel is the path of least resistance and free for this size. Custom domain `web.refproj.example`.

**Mobile via EAS.** `eas build` for iOS and Android, `eas update` for OTA JS updates during iteration. No app-store submission for the reference project — internal distribution via Expo Go (dev) and EAS internal distribution (preview) is enough to prove the flows work.

**Why not Droplet + Docker Compose for the reference project:** you'd spend a day on nginx, Let's Encrypt, systemd, and Postgres backups for no learning value. App Platform gives you all of that for free, and the Dockerfile you write transfers to a Droplet later if Karaoke Place needs more control.

---

## 12. Testing strategy

Light but real — enough to catch regressions when we move to Prompt Bout.

- **Backend unit:** Jest, focused on auth service (token rotation, theft detection, Google ID-token verification with mocked JWKS).
- **Backend integration:** Supertest hitting a real Postgres in Docker, covering the full Google login flow (Google's HTTP calls mocked with `nock` or MSW).
- **Web e2e:** Playwright, one test that logs in via a mocked OAuth flow and asserts the account page renders the user.
- **Mobile:** Detox is heavy for a reference project. Skip it; manual smoke test on a simulator is fine. Add it when there's a real product.

---

## 13. What's deliberately out of scope

So we don't grow the spec on the way to building it:

- Email/password login, magic links, MFA.
- Email verification (we trust the provider's verified email).
- Account linking UI (data model supports it, no UI for it).
- Admin features, user lists, anything multi-user.
- Real-time / WebSockets (Karaoke Place will need this; reference project does not).
- File uploads, S3/Spaces integration.
- Internationalization.
- Dark mode and theming polish.

---

## 14. Suggested build order

When we move from spec to code, my recommended sequence:

1. Monorepo scaffolding (pnpm, Turborepo, Prisma schema, empty NestJS app, empty Next.js app, empty Expo app).
2. `packages/types` with the User and Auth DTOs.
3. NestJS: `/users/me` behind a fake auth guard that reads a header. Get the request lifecycle, validation pipe, error filter, and Prisma all working end-to-end before any OAuth code.
4. Real auth \u2014 Google OAuth, split into 4a (web flow) and 4b (mobile flow).
5. `packages/api-client` with both transports.
6. Web `/login` and `/account`.
7. Mobile `/login` and `/account`.
8. Deploy to App Platform + Vercel + EAS preview.
9. Manual smoke test of the Google login flow on both web and mobile.

Each step is a checkpoint we can review before moving on.

---

## 15. Open items to revisit before code generation

Things I picked a default for that you might want to reconsider — none block the spec but worth a glance:

- **Prisma vs. TypeORM vs. Drizzle.** I assumed Prisma; it's the smoothest with NestJS today. Drizzle is leaner and trendier, TypeORM is the NestJS default but creaky. Say if you want a different one.
- **Zod vs. class-validator** for DTO validation. I assumed Zod for cross-package sharing; class-validator is more idiomatic NestJS. Pick one and we'll stick with it.
- **Turborepo vs. Nx.** Assumed Turborepo. Nx is more powerful but heavier; only worth it if you expect many more apps/packages.
- **Token TTLs** (15 min access, 30 day refresh). Standard but adjustable.
