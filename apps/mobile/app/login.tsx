import { useState } from 'react';
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleIcon } from '../components/google-icon';
import { Logo } from '../components/logo';
import { useAuth } from '../lib/auth';
import { colors, radii, spacing, type } from '../lib/theme';

/**
 * Login screen. Single primary action: Continue with Google.
 * Card-on-canvas layout mirrors the web equivalent at /login;
 * proportions adapted for portrait phone.
 */
export default function LoginScreen(): React.JSX.Element {
  const { user, signIn, error } = useAuth();
  const [busy, setBusy] = useState(false);

  // If somehow we land on /login while authenticated (e.g. deep link),
  // bounce to /account. Same behavior as the web's middleware.
  if (user) {
    return <Redirect href="/account" />;
  }

  async function handlePress(): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      await signIn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.page,
        paddingHorizontal: spacing.xl,
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.hairline,
            padding: spacing.xl,
          }}
        >
          <View style={{ marginBottom: spacing.lg + spacing.sm }}>
            <Logo />
          </View>

          <Text
            style={[
              type.display,
              {
                color: colors.ink.primary,
                marginBottom: spacing.xs,
              },
            ]}
          >
            Sign in
          </Text>
          <Text
            style={[
              type.caption,
              {
                color: colors.ink.muted,
                marginBottom: spacing.xl,
              },
            ]}
          >
            Continue with Google to access your dashboard.
          </Text>

          <Pressable
            onPress={handlePress}
            disabled={busy}
            style={({ pressed }) => ({
              backgroundColor: colors.ink.primary,
              borderRadius: radii.md,
              paddingVertical: 13,
              paddingHorizontal: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              opacity: pressed ? 0.85 : busy ? 0.6 : 1,
            })}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 2,
                    backgroundColor: colors.white,
                    padding: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GoogleIcon size={16} />
                </View>
                <Text
                  style={[
                    type.bodyMedium,
                    { color: colors.white },
                  ]}
                >
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>

          {error ? (
            <View
              style={{
                marginTop: spacing.md,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: `${colors.danger}40`,
                backgroundColor: `${colors.danger}10`,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
            >
              <Text
                style={[
                  type.mono,
                  { color: colors.danger, fontSize: 11 },
                ]}
              >
                {error}
              </Text>
            </View>
          ) : null}

          <Text
            style={[
              type.caption,
              {
                color: colors.ink.faint,
                textAlign: 'center',
                marginTop: spacing.lg,
                fontSize: 12,
              },
            ]}
          >
            By signing in, you agree to our terms.
          </Text>
        </View>

        <Text
          style={[
            type.caption,
            {
              color: colors.ink.faint,
              textAlign: 'center',
              marginTop: spacing.md,
              fontSize: 12,
            },
          ]}
        >
          New here? An account is created automatically on first sign-in.
        </Text>
      </View>

      <Text
        style={[
          type.monoLabel,
          {
            color: colors.ink.faint,
            textAlign: 'center',
            paddingBottom: spacing.md,
          },
        ]}
      >
        ref-proj · auth reference
      </Text>
    </SafeAreaView>
  );
}
