import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { colors } from '../lib/theme';

/**
 * Root route. Bounces to /login or /account depending on auth state.
 * Shows a spinner while the bootstrap fetch is in flight (the brief
 * moment between app start and AuthProvider's useEffect completing).
 */
export default function Index(): React.JSX.Element {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.page,
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return <Redirect href={user ? '/account' : '/login'} />;
}
