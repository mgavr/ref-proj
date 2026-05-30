import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { ApiError } from '@refproj/api-client';
import type { User } from '@refproj/types';
import { getApiClient } from './api';
import { secureTokenStorage } from './token-storage';

// Required by expo-auth-session: prepares the WebBrowser for sign-in
// redirects. Called once when the module loads.
WebBrowser.maybeCompleteAuthSession();

/**
 * Auth state shared across the app. Exposes the current user (null if
 * signed out), a loading flag, and the sign-in / sign-out actions.
 *
 * Sign-in flow (dev/production build):
 *   1. Google.useAuthRequest with iosClientId triggers the system
 *      browser (in-app or Safari) with Google's consent screen. The
 *      redirect URI is the reversed iOS client ID
 *      (com.googleusercontent.apps.<id>://) — Google requires this
 *      for iOS clients; expo-auth-session constructs it automatically
 *      when iosClientId is provided.
 *   2. Google returns to us with an id_token in the response.
 *   3. We POST that id_token to /auth/mobile/verify, which verifies
 *      it against Google's JWKS (the API accepts either the Web
 *      client ID or the iOS client ID as the `aud` claim — see
 *      apps/api/src/auth/google-oauth.service.ts).
 *   4. The API returns a user + token pair. We store the tokens in
 *      iOS Keychain via expo-secure-store, set the user in state,
 *      and the UI bounces to /account.
 *
 * Sign-out flow:
 *   1. Read the refresh token from SecureStore.
 *   2. POST /auth/mobile/logout to revoke the token family server-side.
 *   3. Clear SecureStore.
 *   4. Clear local state.
 *
 * NOTE: This will NOT work in Expo Go since Expo Go can't register
 * custom URL schemes. Run in a development build via EAS Build.
 */

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Last sign-in error, if any. UI can show it without owning the
   * try/catch around signIn.
   */
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  // `loading` is true until we know whether there's an existing session.
  // After the bootstrap fetch resolves, it stays false; we don't use
  // it for in-flight sign-in/out (the buttons manage their own state).
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const extra = Constants.expoConfig?.extra as
    | { googleClientId?: string; googleIosClientId?: string }
    | undefined;
  const iosClientId = extra?.googleIosClientId;
  // Web client ID kept here for completeness (used by Android and Web,
  // and for the iOS client's serverClientId param if we add server-side
  // id_token verification refinements later).
  const webClientId = extra?.googleClientId;

  // useAuthRequest builds the OAuth state + PKCE pair and returns a
  // promptAsync() we call to open the browser. Re-runs only when the
  // clientIds change (they shouldn't, in practice).
  //
  // The 'providers/google' wrapper handles the redirect URI plumbing
  // automatically based on which clientId is provided per platform:
  // - iosClientId  → com.googleusercontent.apps.<id>:// (the reversed
  //   iOS client ID format Google requires for iOS OAuth clients)
  // - androidClientId → app's scheme:// (Android uses a different
  //   model than iOS; not configured here yet)
  // - clientId (Web) → used as fallback and as the audience claim
  //   for server-side ID token verification
  const [, response, promptAsync] = Google.useAuthRequest({
    iosClientId,
    // Fall back to the Web client ID if iosClientId is not set —
    // shouldn't happen in practice with proper env config, but
    // graceful fallback for misconfigured dev builds.
    clientId: webClientId,
    // Force the response to be an id_token rather than an access_token —
    // the API only needs the id_token to verify the user's identity
    // against Google's JWKS.
    responseType: 'id_token',
    scopes: ['openid', 'email', 'profile'],
  });

  // Bootstrap: on mount, see if we already have tokens. If so, try
  // /users/me to confirm the session is alive. If 401 (or any other
  // error), clear and stay logged out.
  useEffect(() => {
    (async () => {
      const tokens = await secureTokenStorage.getTokens();
      if (!tokens?.accessToken) {
        setLoading(false);
        return;
      }
      try {
        const me = await getApiClient().users.me();
        setUser(me);
      } catch (e) {
        // The bearer transport already tried to refresh once. If we
        // got here, refresh failed too — storage was cleared by the
        // transport. Nothing else to do.
        if (!(e instanceof ApiError) || e.status !== 401) {
          console.warn('[auth bootstrap] unexpected error:', e);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Watch for the OAuth response. When promptAsync() succeeds, the
  // response param is populated; we extract the id_token and exchange
  // it via /auth/mobile/verify.
  useEffect(() => {
    if (!response) return;
    if (response.type !== 'success') {
      if (response.type === 'error') {
        setError(response.error?.message ?? 'OAuth flow failed.');
      } else if (response.type === 'cancel' || response.type === 'dismiss') {
        // User backed out; not an error per se. Stay silent.
        setError(null);
      }
      return;
    }
    const idToken = response.params['id_token'];
    if (typeof idToken !== 'string') {
      setError('No id_token in OAuth response.');
      return;
    }
    (async () => {
      try {
        const session = await getApiClient().auth.mobileVerify(idToken);
        await secureTokenStorage.setTokens(session.tokens);
        setUser(session.user);
        setError(null);
      } catch (e) {
        if (e instanceof ApiError) {
          setError(e.message);
        } else {
          setError(e instanceof Error ? e.message : 'Sign-in failed.');
        }
      }
    })();
  }, [response]);

  const signIn = useCallback(async () => {
    setError(null);
    if (!iosClientId && !webClientId) {
      setError(
        'Google client ID not configured. Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in apps/mobile/.env.',
      );
      return;
    }
    await promptAsync();
  }, [promptAsync, iosClientId, webClientId]);

  const signOut = useCallback(async () => {
    setError(null);
    const tokens = await secureTokenStorage.getTokens();
    if (tokens?.refreshToken) {
      try {
        await getApiClient().auth.logoutMobile(tokens.refreshToken);
      } catch {
        // Even if the server logout fails (e.g. network), proceed —
        // the user wanted out. The refresh token is short-lived and
        // will rotate-fail on its next use anyway.
      }
    }
    await secureTokenStorage.clearTokens();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signOut, error }),
    [user, loading, signIn, signOut, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be called inside <AuthProvider>');
  }
  return ctx;
}
