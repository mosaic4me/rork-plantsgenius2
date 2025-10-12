import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { Platform } from "react-native";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
    console.log('[tRPC] Using EXPO_PUBLIC_RORK_API_BASE_URL:', url);
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  if (process.env.EXPO_PUBLIC_TOOLKIT_URL) {
    const url = process.env.EXPO_PUBLIC_TOOLKIT_URL;
    console.log('[tRPC] Using EXPO_PUBLIC_TOOLKIT_URL:', url);
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  if (Platform.OS === 'web') {
    const webUrl = typeof window !== 'undefined' ? window.location.origin : '';
    console.log('[tRPC] Using web origin:', webUrl);
    return webUrl;
  }

  console.warn('[tRPC] No base URL configured - backend features will be unavailable');
  console.warn('[tRPC] Please set EXPO_PUBLIC_RORK_API_BASE_URL or use Guest Mode');
  return null;
};

const baseUrl = getBaseUrl();

if (baseUrl) {
  console.log('[tRPC] Client configured to connect to:', `${baseUrl}/api/trpc`);
} else {
  console.warn('[tRPC] Backend not configured - app will run in offline mode');
  console.warn('[tRPC] Authentication and cloud features will be unavailable');
}

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: baseUrl ? `${baseUrl}/api/trpc` : '/api/trpc',
      transformer: superjson,
      fetch: async (url, options) => {
        if (!baseUrl) {
          const error = new Error('Backend service is not configured. Please use Guest Mode to continue.');
          console.warn('[tRPC] Backend unavailable:', error.message);
          throw error;
        }

        try {
          console.log('[tRPC] Request to:', url);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
              ...options?.headers,
              'Content-Type': 'application/json',
            },
          });
          
          clearTimeout(timeoutId);
          
          console.log('[tRPC] Response:', response.status, response.statusText);
          
          if (!response.ok) {
            const contentType = response.headers.get('content-type');
            
            if (response.status === 404) {
              console.error('[tRPC] 404 - Backend endpoint not found');
              throw new Error('Backend service is not available. The server may be starting up or not deployed. Please use Guest Mode.');
            }
            
            if (contentType?.includes('text/html')) {
              console.error('[tRPC] Received HTML instead of JSON');
              throw new Error('Backend service returned an error page. Please use Guest Mode.');
            }
          }

          return response;
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.error('[tRPC] Request timeout after 10s');
            throw new Error('Backend service is not responding. Please check your connection or use Guest Mode.');
          }
          
          if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
            console.error('[tRPC] Network error - cannot reach backend');
            throw new Error('Cannot connect to backend service. Please check your internet connection or use Guest Mode.');
          }
          
          console.error('[tRPC] Request failed:', error.message);
          throw error;
        }
      },
    }),
  ],
});
