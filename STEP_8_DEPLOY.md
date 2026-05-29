# Step 8 — Deploy ref-proj to DigitalOcean + Vercel

This is the runbook for taking the working dev environment to production.
Follow top to bottom; each step explains what to do, why, and what to
report back so the next step can use real URLs.

## What you'll get

- **API** (NestJS + managed Postgres) on DigitalOcean App Platform
  - URL: `https://ref-proj-<random>.ondigitalocean.app`
  - Cost: $12/month ($5 app + $7 dev DB)
- **Web** (Next.js) on Vercel
  - URL: `https://ref-proj-<random>.vercel.app`
  - Cost: free (hobby tier)
- **Separate prod Google OAuth client** — keeps dev credentials safe
- Auto-deploy on push to `main` from both providers

Total time: ~45-60 minutes.

---

## 1. Sign up for the providers

### DigitalOcean

1. Go to https://cloud.digitalocean.com/registrations/new
2. Sign up with GitHub for the easy flow (it links your account so App
   Platform can pull from your repos).
3. Add a payment method — required even for the $0 free trial.
4. New accounts get a $200 / 60-day credit. You can use that to cover
   the first ~16 months of this project.

### Vercel

1. Go to https://vercel.com/signup
2. Sign in with GitHub.
3. Select the **Hobby** plan (free, fine for this).

You don't need to create any projects yet — we'll do that from the
respective dashboards in the steps below.

**Report back:** "DO and Vercel accounts are ready."

---

## 2. Create the App Platform app

App Platform will read `.do/app.yaml` from `main` and provision an API
service + Postgres database from it.

1. Go to https://cloud.digitalocean.com/apps
2. Click **Create App**.
3. **Source**:
   - Select **GitHub**.
   - If this is your first time, you'll have to authorize DigitalOcean
     to access your GitHub repos. Limit it to just `mgavr/ref-proj`
     for safety.
   - Repository: `mgavr/ref-proj`
   - Branch: `main`
   - Source directory: leave as `/`
   - Autodeploy: ✓ on
4. App Platform should detect `.do/app.yaml` automatically and show
   you the spec preview ("Use existing app spec"). Click **Next**.
   - If it doesn't auto-detect: click "Edit Spec" and paste the
     contents of `.do/app.yaml` from the repo.
5. **Resources page**:
   - Confirm 1 service (`api`) + 1 database (`db`) are listed.
   - Confirm the api's plan is `apps-s-1vcpu-0.5gb` ($5/mo). If it
     defaulted to something larger, click Edit → Basic XXS.
   - Confirm the db's tier is **Development Database** ($7/mo). If
     it offered Managed, click Edit and pick Development.
6. **Environment variables page**: this is where the `REPLACE_ME_…`
   values from the spec get replaced. You'll do this in two passes —
   set what you can now, come back for the OAuth + URL values later.

   **Set now:**
   - `JWT_ACCESS_SECRET` (mark **Encrypted**) — generate with:
     ```
     openssl rand -hex 32
     ```
   - `JWT_REFRESH_SECRET` (mark **Encrypted**) — generate a different
     value the same way.

   **Leave as `REPLACE_ME_…` for now** (we'll fix in step 5):
   - `API_PUBLIC_URL`
   - `WEB_ORIGIN`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

7. **Info page**: confirm name `ref-proj`, region `NYC`. Click **Next**.
8. **Review page**: total should be ~$12/mo. Click **Create Resources**.

App Platform now builds the Docker image and provisions the database.
First build takes 5-10 minutes (it's downloading the base image, your
deps, building Nest, etc.). Subsequent builds are faster (cached).

**While it builds**: the app's **Overview** page shows a URL like
`ref-proj-abc12.ondigitalocean.app`. **That's the API URL.** Save it.

**The first build will fail** because the OAuth env vars are still
`REPLACE_ME_…` — Zod validation will exit the process at startup. That's
expected; we'll fix it in step 5.

**Report back:**
- "App Platform app created."
- The API URL (e.g. `https://ref-proj-abc12.ondigitalocean.app`).
- Any build errors visible in the Activity tab.

---

## 3. Create the prod Google OAuth client

A separate client from your dev one, scoped to prod URLs only. Saves
you from a misconfigured prod env accidentally calling back to dev.

1. Go to https://console.cloud.google.com/apis/credentials
2. Top dropdown: **Create a new project**. Name: `ref-proj-prod`. Wait
   for it to be created and switch to it.
3. The new project has no OAuth consent screen. Set it up:
   - Left nav → **OAuth consent screen**
   - User type: **External**
   - App name: `ref-proj`
   - User support email: your gmail
   - Developer contact: your gmail
   - Skip the rest (no scopes to add, no test users to add — we'll
     publish the app in a sec)
   - Save and continue
4. Back to **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `ref-proj web (prod)`
   - **Authorized JavaScript origins**: leave empty for now, we'll add
     the Vercel URL in step 5.
   - **Authorized redirect URIs**: also leave empty for now.
   - **Create**

You'll get a Client ID and Client Secret. Save them somewhere temporary
(password manager works). **Don't add them to the app yet — wait for
step 5 when we have the Vercel URL.**

5. Back to **OAuth consent screen** → **Publishing status** → click
   **Publish app**. The dialog asks if you're sure since you haven't
   gone through verification — confirm. The app will be in "Testing"
   for the verification waiting period, but personal Gmail accounts
   can sign in to it during this period without being on the test
   user list, which is what we want.

**Report back:**
- "Prod Google OAuth client created."
- (Keep the Client ID + Secret to yourself — paste them in step 5.)

---

## 4. Create the Vercel project

1. Go to https://vercel.com/new
2. **Import Git Repository**:
   - If you don't see `mgavr/ref-proj` listed, click "Adjust GitHub
     App Permissions" and grant access to it specifically.
   - Click **Import** next to `mgavr/ref-proj`.
3. **Configure Project**:
   - Project Name: `ref-proj` (or whatever)
   - Framework Preset: **Next.js** (should be detected)
   - **Root Directory**: click "Edit" and set to `apps/web`
   - Build & Output Settings (expand "Override"):
     - Install Command: `cd ../.. && pnpm install --frozen-lockfile`
     - Build Command: `cd ../.. && pnpm turbo run build --filter=@refproj/web`
     - Output Directory: leave default (`.next`)

   The build command uses Turborepo (which we have configured in
   `turbo.json`) to build the workspace dependencies (`@refproj/types`,
   `@refproj/api-client`) before building `@refproj/web` — because
   Turbo's `build` task has `dependsOn: ["^build"]`.

   - Environment Variables (add these now, edit them in step 5):
     - `NEXT_PUBLIC_API_BASE_URL` = `/api/v1`  (relative — uses the proxy)
     - `API_BASE_URL` = `https://ref-proj-abc12.ondigitalocean.app/api/v1`
       (your DO URL from step 2 + `/api/v1`)
     - `API_INTERNAL_URL` = `https://ref-proj-abc12.ondigitalocean.app`
       (your DO URL from step 2, no `/api/v1`)
4. Click **Deploy**.

First deploy takes ~2 minutes.

**While it deploys**: the project's URL appears as
`ref-proj-<random>.vercel.app`. **That's the Vercel URL.** Save it.

The first deploy might 502 or show an error on `/` — that's because
the API isn't fully wired up yet (no Google OAuth env vars). Don't
panic.

**Report back:**
- "Vercel project created."
- The Vercel URL (e.g. `https://ref-proj-xyz9.vercel.app`).
- Whether the build succeeded (Vercel will show this).

---

## 5. Wire up the URLs and OAuth

Now everyone knows everyone. Time to put the real URLs in.

### 5a. Google Cloud Console (prod project)

1. In the `ref-proj-prod` project → Credentials → your Web client
2. **Authorized JavaScript origins**, add:
   ```
   https://ref-proj-xyz9.vercel.app
   ```
   (your Vercel URL, no path, no trailing slash)
3. **Authorized redirect URIs**, add:
   ```
   https://ref-proj-xyz9.vercel.app/api/v1/auth/google/callback
   ```
   (your Vercel URL + the callback path)
4. **Save**. (Google warns it can take a few minutes to propagate.)

### 5b. DigitalOcean App Platform env vars

Back in your DO App Platform app → **Settings** → **App-level Environment
Variables** (or **api** service → **Environment Variables**, depending
on which level you set them at originally).

Update the four `REPLACE_ME_…` values:
- `API_PUBLIC_URL` = `https://ref-proj-xyz9.vercel.app`  (your Vercel URL)
- `WEB_ORIGIN` = `https://ref-proj-xyz9.vercel.app`  (same)
- `GOOGLE_CLIENT_ID` = (the prod Client ID from step 3)
- `GOOGLE_CLIENT_SECRET` = (the prod Client Secret from step 3)
  — mark **Encrypted**

Save. App Platform triggers a redeploy. Watch the **Activity** tab —
the new build should succeed this time (env vars now pass Zod
validation).

### 5c. Vercel env vars (verify)

Vercel project → **Settings** → **Environment Variables**. Confirm
the three you set in step 4 are present and apply to Production. If
you need to update `API_INTERNAL_URL` to match the DO URL (you may
have used a placeholder), do so now and trigger a redeploy from the
**Deployments** tab.

**Report back:**
- "DO redeploy succeeded" (or paste the error if not).
- "Vercel env vars confirmed."

---

## 6. Smoke test

1. Open `https://ref-proj-xyz9.vercel.app` in a fresh Incognito window
   (so no Codespace cookies confuse things).
2. You should land on the styled `/login` page.
3. Click **Continue with Google**.
4. Google consent screen — sign in.
5. Should redirect back to `/account` showing your avatar + name +
   the prod user ID + member-since today.
6. Click **Sign out**. Should clear cookies and return to `/login`.

If anything fails along the way:
- API errors: DO dashboard → ref-proj app → **Runtime Logs**.
- Web errors: Vercel dashboard → project → **Logs** tab.
- 401 on `/account`: cookies issue. Open DevTools → Application →
  Cookies. The Vercel hostname should have `refproj_access` and
  `refproj_refresh`. If not, paste the API logs for the
  `/auth/google/callback` request.

**Report back:** "smoke test pass" with a screenshot, or paste the
errors. From here we declare step 9 done too (the smoke test IS
step 9).

---

## Operational notes

### About the request flow

Every API call from the browser is two hops:
```
Browser → Vercel (Next.js rewrite) → DO App Platform (API) → Postgres
```

This adds ~50-150ms per API call vs. talking to the API directly. In
return we get same-origin cookies that work seamlessly. The tradeoff
is correct for an authentication-heavy reference project; for a
high-throughput product API you'd skip the proxy and use a different
session strategy (subdomain cookies on a shared eTLD+1 — see
SPEC.md §4.1) or move both to the same edge platform.

### Auto-deploy

Both providers auto-deploy on push to `main`. Workflow from here:
```
git push origin main
# Wait ~3 min for DO + Vercel to rebuild.
# Refresh in browser.
```

### Updating env vars

- **DO**: Settings → Environment Variables → edit → Save (triggers redeploy).
- **Vercel**: Settings → Environment Variables → edit → Save (triggers
  redeploy on next push, or manually redeploy from Deployments tab).

### Updating the App Platform spec

`.do/app.yaml` changes in `main` do NOT auto-update the live app. To
apply spec changes:
- Dashboard: Settings → App Spec → paste new version → Save, OR
- CLI: `doctl apps update <APP_ID> --spec .do/app.yaml`

### Migrations

The Dockerfile's CMD runs `prisma migrate deploy` on every container
start. New migrations applied to `main` get applied to the DB
automatically on the next deploy. If a migration fails, the deploy
fails (App Platform reports a build error) — better than starting a
server pointed at a half-migrated schema.

### Costs

- DO App Platform Basic XXS: $5/mo
- DO Postgres Dev tier: $7/mo
- Vercel Hobby: $0
- Google Cloud OAuth: $0
- **Total: $12/mo**

To scale up: change `instance_size_slug` in `.do/app.yaml` to a larger
tier and the DB `production: true` with a larger size slug. App
Platform handles the migration without downtime.

### Tearing down

When ref-proj sunsets:
1. DO: Settings → Destroy App. Also destroy the database from the
   Databases section.
2. Vercel: Settings → Advanced → Delete Project.
3. Google Cloud: Delete the `ref-proj-prod` project entirely (no
   monthly cost while it exists, but cleanup is hygienic).
