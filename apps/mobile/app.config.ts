import type { ExpoConfig } from 'expo/config';

/**
 * Expo configuration. Reads runtime values from env (EXPO_PUBLIC_*
 * become available as `process.env.EXPO_PUBLIC_*` in the app; others
 * become `Constants.expoConfig.extra.*`).
 *
 * For Expo Go usage on a real device: set EXPO_PUBLIC_API_BASE_URL to
 * your deployed API base, e.g. https://ref-proj-web.vercel.app/api/v1
 * (the Vercel-fronted URL; web and mobile share that proxy now).
 */
const config: ExpoConfig = {
  name: 'ref-proj',
  slug: 'ref-proj',
  version: '0.0.0',
  orientation: 'portrait',
  // The scheme is what makes deep links like refproj://callback work in
  // a custom dev build. In Expo Go we use the Expo auth proxy URL
  // (https://auth.expo.io/...) so the scheme is only relevant once we
  // graduate to a custom dev build or production app.
  scheme: 'refproj',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.mgavr.refproj',
  },
  android: {
    package: 'com.mgavr.refproj',
  },
  web: {
    bundler: 'metro',
    output: 'static',
  },
  plugins: ['expo-router', 'expo-secure-store'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1',
    // The Web client ID from your Google OAuth (prod) project. Expo Go
    // uses Google's Web flow with the Expo proxy URL as redirect, so
    // the Web client is what's used regardless of native platform.
    googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '',
  },
};

export default config;
