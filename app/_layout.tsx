import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

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
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootLayoutNav />
              <Toast />
            </GestureHandlerRootView>
          </AppProvider>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
