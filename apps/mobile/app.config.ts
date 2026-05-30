import type { ExpoConfig } from 'expo/config';

/**
 * Expo configuration. Reads runtime values from env (EXPO_PUBLIC_*
 * become available as `process.env.EXPO_PUBLIC_*` in the app; others
 * become `Constants.expoConfig.extra.*`).
 *
 * Distribution: this project ships as a dev build via EAS Build, not
 * via Expo Go. Expo Go can't register custom URL schemes, which are
 * required by Google's iOS OAuth client.
 *
 * See STEP_7_MOBILE.md for the full setup runbook.
 */

// Derive the reversed iOS client ID from the env var. Google's iOS
// OAuth client expects redirects to com.googleusercontent.apps.<id>://
// — we have to register that as a URL scheme in Info.plist so iOS
// knows to launch our app when Google redirects there.
function reverseIosClientId(clientId: string): string | null {
  // clientId looks like '670220272975-xxxxxxx.apps.googleusercontent.com'.
  // The reversed form is 'com.googleusercontent.apps.670220272975-xxxxxxx'.
  // Reverse the dotted segments.
  if (!clientId) return null;
  const parts = clientId.split('.');
  if (parts.length < 3) return null;
  return parts.reverse().join('.');
}

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const reversedIosClientId = reverseIosClientId(iosClientId);

const config: ExpoConfig = {
  name: 'ref-proj',
  slug: 'ref-proj',
  version: '0.0.0',
  orientation: 'portrait',
  // EAS Updates configuration — added by `eas build` when it installed
  // expo-updates. Lets us push JS-only updates to installed builds
  // without rebuilding native code. The URL is the EAS project's
  // update endpoint (keyed to our projectId).
  updates: {
    url: 'https://u.expo.dev/64a19315-da0e-4ebc-baee-8f166247413a',
  },
  // runtimeVersion: 'appVersion' means each version field above
  // (currently '0.0.0') is a separate update channel. Native code
  // changes bump this; JS-only changes ship as updates to existing
  // installs of the current version.
  runtimeVersion: {
    policy: 'appVersion',
  },
  // The app's own URL scheme — refproj:// opens our app via deep links.
  // Google's iOS OAuth redirect uses a different scheme (the reversed
  // iOS client ID) — registered via ios.infoPlist below.
  scheme: 'refproj',
  userInterfaceStyle: 'light',
  // newArchEnabled controls React Native's New Architecture (Fabric +
  // TurboModules). It defaults to true in SDK 54 but ships some C++
  // template signature changes that not all RN libraries have caught
  // up with. react-native-svg@15.11.x at the time of writing fails
  // to compile against RN 0.81's New Arch ShadowNode templates.
  //
  // Setting this to false uses the Legacy Architecture, which SDK 54
  // still fully supports. Trade-off: no perf gains from Fabric, but
  // also no compile errors. SDK 55 will drop legacy support; that's
  // when we'd need to update libraries and flip this back to true.
  newArchEnabled: false,
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.mgavr.refproj',
    // Register the reversed iOS client ID as a URL scheme. Without
    // this, Google's redirect after sign-in won't reach our app and
    // the OAuth flow hangs. expo-auth-session generates this redirect
    // URI automatically when iosClientId is passed to useAuthRequest;
    // this Info.plist entry is the receiving side.
    //
    // If EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is unset at build time
    // (e.g. EAS hasn't loaded the secret yet), this falls back to an
    // empty URL schemes array — the build still succeeds but sign-in
    // will fail with "no matching URL scheme". Always set the env var
    // before running `eas build`.
    infoPlist: reversedIosClientId
      ? {
          CFBundleURLTypes: [
            {
              CFBundleURLSchemes: [reversedIosClientId],
            },
          ],
        }
      : {},
  },
  android: {
    package: 'com.mgavr.refproj',
  },
  web: {
    bundler: 'metro',
    output: 'static',
  },
  // expo-dev-client makes this a development build target rather than
  // a production app — adds the dev menu, code reload, etc. Required
  // for EAS dev builds.
  plugins: ['expo-router', 'expo-secure-store', 'expo-dev-client'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1',
    googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    googleIosClientId: iosClientId,
    eas: {
      // EAS project ID — created by `eas init` against your Expo
      // account. Tied to https://expo.dev/accounts/mgavr/projects/ref-proj.
      // If you fork this repo, run `eas init` to get your own ID.
      projectId: '64a19315-da0e-4ebc-baee-8f166247413a',
    },
  },
};

export default config;
