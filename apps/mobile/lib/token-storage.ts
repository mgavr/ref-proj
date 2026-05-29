import * as SecureStore from 'expo-secure-store';
import type { TokenPair } from '@refproj/types';
import type { TokenStorage } from '@refproj/api-client';

/**
 * Persists the access/refresh token pair in iOS Keychain / Android
 * Keystore via expo-secure-store. The bearerTransport from
 * @refproj/api-client reads/writes these on every authenticated
 * request and during refresh-on-401.
 *
 * One JSON blob under a single key — atomic read/write, no need to
 * coordinate two separate keychain entries. The blob is the entire
 * TokenPair object stringified.
 */

const KEY = 'refproj.tokens.v1';

export const secureTokenStorage: TokenStorage = {
  async getTokens(): Promise<TokenPair | null> {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TokenPair;
    } catch {
      // Stored value is corrupt — treat as logged out. The next login
      // will overwrite it cleanly.
      return null;
    }
  },
  async setTokens(tokens: TokenPair): Promise<void> {
    await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
  },
  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY);
  },
};
