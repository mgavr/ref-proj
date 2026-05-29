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
import * as AuthSession from 'expo-auth-session';
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
 * Sign-in flow:
 *   1. expo-auth-session opens Google's consent in the in-app browser
 *      (in Expo Go we use Expo's auth proxy URL —
 *      https://auth.expo.io/@account/slug — as the redirect target,
 *      since Expo Go can't register custom schemes).
 *   2. Google returns to us with an id_token in the response.
 *   3. We POST that id_token to /auth/mobile/verify, which returns a
 *      user + a token pair. The bearer transport stores the tokens.
 *   4. We set the user in state. Now /users/me works.
 *
 * Sign-out flow:
 *   1. Read the refresh token from SecureStore (the bearer transport
 *      handles auth, but logout needs the token explicitly in body).
 *   2. POST /auth/mobile/logout to revoke the family server-side.
 *   3. Clear SecureStore.
 *   4. Clear local state.
 *
 * NOTE: The Expo auth proxy is deprecated; for production you'd move
 * to a Development Build with a custom URL scheme. For this reference
 * project we accept that constraint to stay on Expo Go.
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

// True when this bundle is running inside Expo Go (not a dev build, not
// production). We use this to pick the OAuth redirect URI strategy.
const isExpoGo = Constants.appOwnership === 'expo';

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  // `loading` is true until we know whether there's an existing session.
  // After the bootstrap fetch resolves, it stays false; we don't use
  // it for in-flight sign-in/out (the buttons manage their own state).
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clientId = (Constants.expoConfig?.extra as { googleClientId?: string } | undefined)
    ?.googleClientId;

  // Build the redirect URI. In Expo Go: the Expo proxy URL keyed to
  // this app's Expo account + slug (looks like
  // https://auth.expo.io/@user/ref-proj). In a dev/production build:
  // the app's own scheme.
  //
  // NOTE: makeRedirectUri's useProxy option is removed in newer
  // expo-auth-session versions, but the underlying behavior is still
  // available via the `projectNameForProxy` option. Detect at runtime.
  const redirectUri = AuthSession.makeRedirectUri({
    // In Expo Go we want the proxy URL. The `native` option is what
    // older versions called useProxy.
    scheme: 'refproj',
    // Newer expo-auth-session uses the slug for the proxy URL when
    // present. The slug from app.config.ts is 'ref-proj'.
    preferLocalhost: false,
  });

  // useAuthRequest builds the OAuth state + PKCE pair and returns a
  // promptAsync() we call to open the browser. Re-runs only when the
  // clientId changes (it shouldn't, in practice).
  const [, response, promptAsync] = Google.useAuthRequest({
    clientId,
    // Force the response to be an id_token rather than an access_token —
    // the API only needs the id_token to verify the user's identity
    // against Google's JWKS.
    responseType: 'id_token',
    scopes: ['openid', 'email', 'profile'],
    redirectUri,
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
    if (!clientId) {
      setError(
        'Google client ID not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in apps/mobile/.env.',
      );
      return;
    }
    await promptAsync();
  }, [promptAsync, clientId]);

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
