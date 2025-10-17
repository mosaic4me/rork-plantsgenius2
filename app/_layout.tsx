import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast, { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { trpc, trpcClient } from "@/lib/trpc";
import ErrorBoundary from "@/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300000, // 5 minutes
      gcTime: 600000, // 10 minutes
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      networkMode: 'offlineFirst',
    },
  },
});

function RootLayoutNav() {
  const { user, loading, isGuest } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding').then((value) => {
      setHasSeenOnboarding(value === 'true');
    });
  }, []);

  useEffect(() => {
    if (loading || hasSeenOnboarding === null || isInitialized) {
      return;
    }

    const currentSegment = segments[0] as string | undefined;

    if (!hasSeenOnboarding && currentSegment !== 'onboarding') {
      setIsInitialized(true);
      router.replace('/onboarding' as any);
    } else if (hasSeenOnboarding && !user && !isGuest && currentSegment !== 'auth') {
      setIsInitialized(true);
      router.replace('/auth' as any);
    } else if ((user || isGuest) && (currentSegment === 'auth' || currentSegment === 'onboarding')) {
      setIsInitialized(true);
      router.replace('/(tabs)' as any);
    } else if (!currentSegment || currentSegment === '+not-found') {
      setIsInitialized(true);
      if (!hasSeenOnboarding) {
        router.replace('/onboarding' as any);
      } else if (!user && !isGuest) {
        router.replace('/auth' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    } else {
      setIsInitialized(true);
    }
  }, [user, segments, loading, hasSeenOnboarding, isGuest, router, isInitialized]);

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="results" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="analyzing" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="settings" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="contact" options={{ headerShown: false, presentation: "card" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 1000);
  }, []);

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <RootLayoutNav />
              <Toast
                visibilityTime={2000}
                autoHide={true}
                config={{
                  success: (props) => (
                    <BaseToast
                      {...props}
                      style={{ borderLeftColor: '#7CB342' }}
                      contentContainerStyle={{ paddingHorizontal: 15 }}
                      text1Style={{
                        fontSize: 14,
                        fontWeight: '600',
                      }}
                      text2Style={{
                        fontSize: 12,
                        fontWeight: '400',
                      }}
                      text2NumberOfLines={0}
                    />
                  ),
                  error: (props) => (
                    <ErrorToast
                      {...props}
                      style={{ borderLeftColor: '#F44336' }}
                      contentContainerStyle={{ paddingHorizontal: 15 }}
                      text1Style={{
                        fontSize: 14,
                        fontWeight: '600',
                      }}
                      text2Style={{
                        fontSize: 12,
                        fontWeight: '400',
                      }}
                      text2NumberOfLines={0}
                    />
                  ),
                  info: (props) => (
                    <InfoToast
                      {...props}
                      style={{ borderLeftColor: '#2196F3' }}
                      contentContainerStyle={{ paddingHorizontal: 15 }}
                      text1Style={{
                        fontSize: 14,
                        fontWeight: '600',
                      }}
                      text2Style={{
                        fontSize: 12,
                        fontWeight: '400',
                      }}
                      text2NumberOfLines={0}
                    />
                  ),
                }}
              />
              </GestureHandlerRootView>
            </AppProvider>
          </AuthProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}
