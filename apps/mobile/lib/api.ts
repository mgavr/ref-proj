import Constants from 'expo-constants';
import {
  bearerTransport,
  createApiClient,
  type ApiClient,
} from '@refproj/api-client';
import { secureTokenStorage } from './token-storage';

/**
 * The single API client used across the mobile app. Uses the
 * Bearer transport (Authorization header + auto-refresh-on-401)
 * with SecureStore-backed token storage.
 *
 * Created lazily and memoized so all callers share one instance —
 * Promise.all etc. coordinate correctly through it.
 */

function getApiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as
    | { apiBaseUrl?: string }
    | undefined;
  const base = extra?.apiBaseUrl;
  if (!base) {
    throw new Error(
      'Missing apiBaseUrl. Set EXPO_PUBLIC_API_BASE_URL in your environment.',
    );
  }
  return base;
}

let cached: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (cached) return cached;
  const baseUrl = getApiBaseUrl();
  cached = createApiClient({
    baseUrl,
    transport: bearerTransport({
      baseUrl,
      storage: secureTokenStorage,
    }),
  });
  return cached;
}
