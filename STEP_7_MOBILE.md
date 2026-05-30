# Step 7 — Mobile App (iPhone Dev Build via EAS)

The mobile app ships as an EAS-built development build — not via
Expo Go. Expo Go can't register custom URL schemes, which are
required by Google's iOS OAuth client.

The dev build is a custom version of your app, installed once on
your phone, that connects to Metro just like Expo Go did but with
your own scheme registered for OAuth redirects.

## Total time

- First-time setup: ~45 minutes (Google iOS client, EAS config,
  cloud build wait)
- Subsequent rebuilds: only needed when native dependencies change.
  JS code reloads instantly via Metro, like Expo Go.

## Architecture overview

```
iPhone (dev build)              ┌── /api/v1/* ──────────────────┐
                                ▼                                │
[Continue with Google] ──▶ Google OAuth ──▶ refproj://auth ──▶ App
                          (iOS Client)      (custom scheme)
                                                                 │
                                                  POST id_token  ▼
                                              /auth/mobile/verify
                                                                 │
                                                ▼─── access + refresh tokens
                                          stored in iOS Keychain
```

---

## Prerequisites

- Step 7's existing setup done: `EXPO_TOKEN` set in Codespace secrets,
  Expo Go installed as a reference (we won't use it for OAuth but
  having it around is useful)
- Web auth flow works in production (step 6/8 done)

---

## 1. Create the iOS OAuth client in Google Console

If you've already done this (Saturday morning's step), skip to step 2.

1. Open https://console.cloud.google.com/apis/credentials in your
   `ref-proj-prod` project (top-bar project switcher).
2. Click **+ Create credentials → OAuth client ID**.
3. **Application type:** select **iOS** (not "Web application").
4. **Name:** `ref-proj iOS (prod)`.
5. **Bundle ID:** `com.mgavr.refproj` — must match exactly what's
   in `apps/mobile/app.config.ts` under `ios.bundleIdentifier`.
6. Leave App Store ID empty.
7. Leave Team ID empty.
8. **Create**. Note the Client ID — different from your Web one.
   Save it. There is no Client Secret for iOS clients.

---

## 2. Update the API to accept the iOS client ID

The API (DigitalOcean) needs to know about the iOS client ID so it
can verify id_tokens issued by it. Already set up via the
`GOOGLE_IOS_CLIENT_ID` env var.

1. Open the DigitalOcean app → **api** component → **Settings** →
   **Environment Variables** → **Edit**.
2. Click **+ Add variable**.
3. Key: `GOOGLE_IOS_CLIENT_ID`
4. Value: (paste your iOS Client ID from step 1)
5. Scope: **Run time**
6. Encrypt: yes
7. **Save**. DO redeploys automatically (~3 min).

When it's green, the API will accept id_tokens from either client.

---

## 3. Set the mobile env vars

In your Codespace:

```bash
cd /workspaces/ref-proj
cp apps/mobile/.env.example apps/mobile/.env
```

Edit `apps/mobile/.env`:

```
EXPO_PUBLIC_API_BASE_URL=https://ref-proj-web.vercel.app/api/v1
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<your-prod-Web-client-id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<your-prod-iOS-client-id>
```

---

## 4. Set up EAS Build

Install eas-cli and initialize the project:

```bash
pnpm install
pnpm dlx eas-cli login    # uses your EXPO_TOKEN, should auto-pass
pnpm --filter @refproj/mobile exec eas init
```

`eas init` will:
- Link this project to your Expo account
- Write a `projectId` into `app.config.ts` extra.eas section
- Set up the EAS project for builds

---

## 5. Kick off the dev build

```bash
pnpm --filter @refproj/mobile exec eas build --profile development --platform ios
```

You'll be prompted for a few things:

- **"Generate a new Apple provisioning profile?"** → Yes (let EAS
  handle Apple stuff for you; no Apple Developer membership needed
  for development builds with this method)
- **"Apple ID"** → your Apple ID email (same one as your iPhone)
- **"App Store Connect API key"** → No (skip; just for App Store
  submission)
- **"Distribution certificate"** → Generate a new one
- **"Push notification key"** → Skip
- **"Provisioning profile"** → Generate

EAS will then run the build on their cloud servers. Expect ~15-25
minutes on the free tier queue.

While it builds, you can:
- Browse to `https://expo.dev/accounts/mgavr/projects/ref-proj/builds`
  to watch progress
- Or watch the terminal — EAS streams updates

When it finishes, EAS prints a QR code and a build URL.

---

## 6. Install the dev build on your iPhone

1. **Open the build URL on your iPhone in Safari.** (Don't try to
   scan the QR with Camera — same issue as before with `exp://`.)
2. Safari shows a page with an "Install" button.
3. Tap Install.
4. Go to **Settings → General → VPN & Device Management** on your
   iPhone. Trust the developer certificate that just appeared.
5. Open the newly installed **ref-proj** app from your home screen.
6. First launch will say "Looking for development servers". This
   means the app is ready to connect to a Metro instance.

---

## 7. Start the Metro dev server

```bash
cd /workspaces/ref-proj
pnpm --filter @refproj/mobile dev -- --tunnel
```

(`--tunnel` because the Codespace network isn't reachable from your
phone directly.)

When the dev server is up, it appears in your installed dev build
under "Development servers" (the dev build is signed into your
Expo account via the build process, so the auto-discover works).
Tap it to load the JS bundle.

---

## 8. Sign in

Open the app. Tap **Continue with Google**.

- The system browser (or in-app Safari View Controller) opens
  Google's consent screen.
- Choose your account, approve.
- Browser closes, lands you back in the app on the account screen.

Done. Your tokens are in iOS Keychain. Reload the app — it stays
signed in. Auto-refresh on 401 works via the bearer transport.

---

## Likely failure modes

### EAS build fails

- **"Apple ID invalid"**: typo in your Apple ID, or two-factor needs
  approval. Retry; EAS handles 2FA prompts.
- **"Bundle identifier already in use"**: someone else owns
  `com.mgavr.refproj`. Change it in `app.config.ts` and the iOS
  OAuth client to a unique identifier (e.g.
  `com.yourgithub.refproj`).
- **Build queue full**: free tier can have multi-hour queues during
  peak times. Wait, or upgrade to paid for priority.

### App installs but won't open

- iPhone needs to trust the certificate: Settings → General → VPN
  & Device Management → tap your name → Trust.

### "No matching URL scheme" at sign-in

- The reversed iOS client ID isn't registered as a URL scheme in
  Info.plist. Add it to `app.config.ts` ios.bundleIdentifier (yes,
  add to URL schemes via a config plugin). Rebuild via EAS.

### "redirect_uri_mismatch"

- The OAuth redirect URI doesn't match what Google expects. iOS
  clients use `com.googleusercontent.apps.<id>://` automatically;
  Google generates this for you when you set up the iOS client. No
  manual config in Google Console.

### Sign-in succeeds but app crashes on /account

- Most likely an API error. Check Metro logs in your terminal.
- Confirm `GOOGLE_IOS_CLIENT_ID` is set in DO env vars (step 2).

---

## What's not set up

- **No Android.** Same code works on Android too, but Google's
  Android OAuth requires SHA-1 certificate fingerprints. Future work.
- **No App Store / TestFlight pipeline.** This is a dev build for
  testing only. Future work uses `eas build --profile production` +
  `eas submit`.
- **No automatic background token refresh.** Tokens refresh
  on-demand when the API returns 401. Good enough for our reference
  app.
