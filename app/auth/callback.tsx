import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

export default function AuthCallback() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[AuthCallback] OAuth callback received, redirecting to app');
        router.replace('/(tabs)' as any);
      } catch (error) {
        console.error('Error in auth callback:', error);
        router.replace('/auth' as any);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
