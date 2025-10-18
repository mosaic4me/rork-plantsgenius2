import { router } from 'expo-router';

export const AppRoutes = {
  tabs: '/(tabs)' as const,
  scan: '/scan' as const,
  history: '/history' as const,
  garden: '/garden' as const,
  profile: '/profile' as const,
  settings: '/settings' as const,
  billing: '/billing' as const,
  contact: '/contact' as const,
  auth: '/auth' as const,
  onboarding: '/onboarding' as const,
} as const;

type RouteValue = (typeof AppRoutes)[keyof typeof AppRoutes];

export const navigate = {
  push: (route: RouteValue) => router.push(route as any),
  replace: (route: RouteValue) => router.replace(route as any),
  back: () => router.back(),
  canGoBack: () => router.canGoBack(),
};
