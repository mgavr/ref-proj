# Step 7 — Mobile App Setup (Expo Go on iPhone)

The Expo mobile app talks to the same production API as the web app
(at `https://ref-proj-web.vercel.app/api/v1`). For this reference
project we use Expo Go with the (deprecated) Expo auth proxy, which
keeps the setup minimal — no native build needed.

## What you'll get

- iPhone app running through Expo Go
- Same Linear-leaning aesthetic as the web frontend, adapted for touch
- Full auth flow: tap "Continue with Google" → Google consent →
  `/auth/mobile/verify` → tokens stored in iOS Keychain → account screen
- Auto-refresh on 401 (via the bearer transport)

## Total time: ~15 minutes

---

## 1. Set up an Expo account

The Expo auth proxy URL is keyed to an Expo account name, so you need
one even with Expo Go.

1. Go to https://expo.dev/signup, create an account. Free.
2. In your Codespace terminal:
   ```bash
   pnpm dlx expo login
   ```
   Enter your Expo username and password. (Or use SSO; the CLI walks
   you through it.)
3. Verify:
   ```bash
   pnpm dlx expo whoami
   ```
   Should print your Expo username.

The proxy URL will be `https://auth.expo.io/@<your-username>/ref-proj`.
Note that exact URL — you'll need it in step 3.

**Report back:** Your Expo username (so I can confirm the proxy URL).

---

## 2. Install Expo Go on your iPhone

1. App Store → search **Expo Go** → install.
2. Open it once. You can sign in with your Expo account if you want
   (makes the dev experience smoother), but it's not required.

---

## 3. Add the Expo proxy URL to your Google OAuth client

Same `ref-proj-prod` project from the web deploy. Same OAuth client
(`ref-proj web (prod)`). We're adding one more authorized redirect URI.

1. Open https://console.cloud.google.com/apis/credentials in the
   `ref-proj-prod` project.
2. Click into `ref-proj web (prod)`.
3. Under **Authorized redirect URIs**, click **+ Add URI** and enter:
   ```
   https://auth.expo.io/@<your-expo-username>/ref-proj
   ```
   Replace `<your-expo-username>` with whatever `expo whoami` printed.
4. Click **Save**. Wait a couple of minutes for Google to propagate.

**Report back:** "Added Expo proxy URL to Google."

---

## 4. Set the mobile env vars

In your Codespace:

```bash
cd /workspaces/ref-proj/apps/mobile
cp .env.example .env
```

Edit `apps/mobile/.env` and fill in:

```
EXPO_PUBLIC_API_BASE_URL=https://ref-proj-web.vercel.app/api/v1
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<your-google-web-client-id-from-prod-project>
```

The Client ID is the same one you set as `GOOGLE_CLIENT_ID` in DO
during section 5 of the web deploy. Looks like
`670220272975-lj7uj8o7p47r5fd759rhss7nqmlht5bo.apps.googleusercontent.com`.

---

## 5. Start the Expo dev server with tunnel mode

In the Codespace terminal:

```bash
cd /workspaces/ref-proj
pnpm --filter @refproj/mobile dev -- --tunnel
```

(The `--tunnel` flag tells Expo to expose the bundle over ngrok-like
tunneling, since your phone can't reach the Codespace network directly.)

First time, Expo may prompt to install `@expo/ngrok` — accept.

When it's ready you'll see a QR code in the terminal plus a URL like
`exp://blah-blah-anonymous.tunnel.expo.dev:80`.

---

## 6. Open the app on your phone

1. Open the **Camera** app on your iPhone.
2. Point it at the QR code in the terminal.
3. A notification appears: "Open in Expo Go" — tap it.
4. Expo Go opens, loads the bundle (~30 seconds first time on tunnel),
   shows the login screen.

---

## 7. Sign in

Tap **Continue with Google**. The in-app browser opens with Google's
consent screen.

- First time: Google shows the consent dialog. Approve.
- Subsequent times: usually auto-completes without prompts.

The browser closes, and you should land on the account screen with
your avatar, name, email, the user ID, member-since date, "Active"
pill, and a Sign out button.

---

## Likely failure modes

### "Invalid redirect URI" from Google

The proxy URL you registered in step 3 doesn't exactly match what
expo-auth-session is generating. Likely causes:

- Wrong Expo username in the URL (look at `expo whoami`)
- Wrong slug — must be `ref-proj` (from `app.config.ts`)
- Forgot to save in Google Console

### "Access blocked: this app's request is invalid"

Same family. Double-check the URI exactly.

### Bundle won't load on phone

- Tunnel can be slow. Wait up to a minute on first load.
- If it times out, try without tunnel from a real machine where your
  phone is on the same Wi-Fi:
  ```bash
  pnpm --filter @refproj/mobile dev
  ```
  (Won't work from Codespace, since your phone isn't on the Codespace
  network — but if you have a local checkout, this is faster.)

### App opens but shows "Network request failed"

Check `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env`. Confirm the
URL is reachable from your phone's browser:
`https://ref-proj-web.vercel.app/api/v1/auth/_debug` should show the
debug page.

### "Sign-in failed: ..." with a specific message

That's the API talking. Common ones:
- `OAUTH_INVALID_TOKEN` — the Google ID token was rejected (probably
  expired in the round-trip; retry)
- `OAUTH_PROVIDER_MISMATCH` — you signed in with a different Google
  account than the one linked to this user; sign out from Google in
  the in-app browser and try again

---

## What's *not* set up

- **No native build / EAS.** This is Expo Go only. You can't install
  this on a phone outside Expo Go.
- **No App Store / TestFlight pipeline.** Future work.
- **No Android.** The same code works on Android too (Google OAuth
  config aside), but we haven't built/tested it.
- **No Apple Sign In.** The reference is Google-only.

If/when ref-proj inspires a real product, the EAS Build path is where
you go — and the auth code we have here barely changes (just swap the
redirect URI logic in `lib/auth.tsx` for a custom scheme).
