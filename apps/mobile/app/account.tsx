import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/logo';
import { useAuth } from '../lib/auth';
import { colors, radii, spacing, type } from '../lib/theme';

/**
 * Account screen. Mirrors apps/web/app/account/page.tsx — same
 * vocabulary, native primitives. Shows avatar/name/email, a status
 * pill, a metadata table, and the sign-out action.
 */
export default function AccountScreen(): React.JSX.Element {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!user) {
    return <Redirect href="/login" />;
  }

  const createdAt = new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  async function handleSignOut(): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
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
        {/* Brand mark above the card */}
        <View style={{ marginBottom: spacing.md }}>
          <Logo />
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.hairline,
            overflow: 'hidden',
          }}
        >
          {/* Header row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.hairline,
            }}
          >
            {user.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radii.full,
                  borderWidth: 1,
                  borderColor: colors.hairline,
                }}
              />
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radii.full,
                  backgroundColor: colors.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={[
                    type.title,
                    { color: colors.accent },
                  ]}
                >
                  {user.displayName.trim().charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[
                  type.bodyMedium,
                  { color: colors.ink.primary },
                ]}
                numberOfLines={1}
              >
                {user.displayName}
              </Text>
              <Text
                style={[
                  type.caption,
                  {
                    color: colors.ink.muted,
                    marginTop: 2,
                    fontSize: 12,
                  },
                ]}
                numberOfLines={1}
              >
                {user.email}
              </Text>
            </View>
            {/* Active pill */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                borderRadius: radii.md,
                backgroundColor: colors.accentSoft,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.accent,
                }}
              />
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 11,
                  fontWeight: '500',
                }}
              >
                Active
              </Text>
            </View>
          </View>

          {/* Metadata rows */}
          <MetaRow label="User ID" value={user.id} />
          <MetaRow label="Member since" value={createdAt} />
          <MetaRow label="Provider" value="google" last />

          {/* Footer with sign-out */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderTopWidth: 1,
              borderTopColor: colors.hairline,
            }}
          >
            <Text
              style={[
                type.caption,
                {
                  color: colors.ink.muted,
                  fontSize: 12,
                  flex: 1,
                },
              ]}
              numberOfLines={1}
            >
              Welcome back, {firstName(user.displayName)}.
            </Text>
            <Pressable
              onPress={handleSignOut}
              disabled={busy}
              style={({ pressed }) => ({
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: pressed ? colors.hairlineStrong : colors.hairline,
                backgroundColor: pressed ? colors.page : colors.surface,
                paddingHorizontal: spacing.md - 2,
                paddingVertical: 6,
                opacity: busy ? 0.5 : 1,
              })}
            >
              {busy ? (
                <ActivityIndicator color={colors.ink.primary} size="small" />
              ) : (
                <Text
                  style={{
                    color: colors.ink.primary,
                    fontSize: 12,
                    fontWeight: '500',
                  }}
                >
                  Sign out
                </Text>
              )}
            </Pressable>
          </View>
        </View>
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

function MetaRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}): React.JSX.Element {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.hairline,
      }}
    >
      <Text
        style={[
          type.monoLabel,
          { color: colors.ink.faint, fontSize: 10 },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          type.mono,
          {
            color: colors.ink.muted,
            flexShrink: 1,
            textAlign: 'right',
            marginLeft: spacing.md,
          },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function firstName(displayName: string): string {
  return displayName.split(/\s+/)[0] ?? displayName;
}
