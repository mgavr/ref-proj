import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'ref-proj',
  slug: 'ref-proj',
  version: '0.0.0',
  orientation: 'portrait',
  scheme: 'refproj',
  userInterfaceStyle: 'automatic',
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
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Populated in build step §14.7 (per SPEC.md).
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1',
  },
};

export default config;
