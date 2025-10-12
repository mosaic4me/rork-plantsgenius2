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

  if (Platform.OS === 'web') {
    const webUrl = typeof window !== 'undefined' ? window.location.origin : '';
    console.log('[tRPC] Using web origin (fallback):', webUrl);
    return webUrl;
  }

  console.warn('[tRPC] No base URL found - backend features will be disabled');
  return '';
};

const baseUrl = getBaseUrl();

if (baseUrl) {
  console.log('[tRPC] Client will connect to:', `${baseUrl}/api/trpc`);
} else {
  console.warn('[tRPC] No base URL configured. Backend calls will fail.');
}

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: baseUrl ? `${baseUrl}/api/trpc` : '/api/trpc',
      transformer: superjson,
      fetch: async (url, options) => {
        if (!baseUrl) {
          const error = new Error('Backend is not available. Please set EXPO_PUBLIC_RORK_API_BASE_URL to your backend URL.');
          console.warn('[tRPC]', error.message);
          throw error;
        }

        try {
          console.log('[tRPC] Fetching:', url);
          const response = await fetch(url, options);
          console.log('[tRPC] Response status:', response.status, response.statusText);
          
          if (!response.ok) {
            const contentType = response.headers.get('content-type');
            console.log('[tRPC] Response content-type:', contentType);
            
            if (contentType?.includes('text/html')) {
              const htmlText = await response.text();
              console.error('[tRPC] Received HTML instead of JSON:', htmlText.substring(0, 200));
              throw new Error('Backend returned HTML instead of JSON. The tRPC endpoint may not be properly configured.');
            }
            
            if (response.status === 404) {
              throw new Error('Backend service not available. Please ensure the backend server is running.');
            }
          }

          return response;
        } catch (error) {
          console.error('[tRPC] Fetch error:', error);
          throw error;
        }
      },
    }),
  ],
});
