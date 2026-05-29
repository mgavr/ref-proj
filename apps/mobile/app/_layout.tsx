import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/auth';
import { colors } from '../lib/theme';

/**
 * Root layout. Wraps the stack in AuthProvider so every screen can
 * call useAuth(). The bootstrap fetch in AuthProvider's useEffect
 * means children render after we know whether there's a session.
 *
 * Stack hides the header by default — both our screens are full-bleed
 * compositions that handle their own top affordances.
 */
export default function RootLayout(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.page },
            animation: 'fade',
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
