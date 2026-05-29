import { Text, View } from 'react-native';
import { colors, type } from '../lib/theme';

/**
 * Small geometric mark + wordmark for the mobile app. Mirrors
 * components/logo.tsx on web — same shape, native primitives.
 */
export function Logo(): React.JSX.Element {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          backgroundColor: colors.ink.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            backgroundColor: colors.accent,
          }}
        />
      </View>
      <Text
        style={[
          type.bodyMedium,
          {
            color: colors.ink.primary,
            letterSpacing: -0.2,
          },
        ]}
      >
        ref-proj
      </Text>
    </View>
  );
}
