import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    const url = process.env.EXPO_PUBLIC_API_BASE_URL;
    console.log('[tRPC] Using production API:', url);
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  console.warn('[tRPC] EXPO_PUBLIC_API_BASE_URL not configured');
  console.warn('[tRPC] Please set EXPO_PUBLIC_API_BASE_URL to https://api.plantsgenius.site');
  console.warn('[tRPC] You can continue using Guest Mode for limited features');
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
          console.log('[tRPC] Backend not configured - request blocked');
          throw new Error('BACKEND_NOT_CONFIGURED: Please set EXPO_PUBLIC_API_BASE_URL to https://api.plantsgenius.site or use Guest Mode');
        }

        try {
          console.log('[tRPC] Making request to:', url);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
              ...options?.headers,
              'Content-Type': 'application/json',
            },
          });
          
          clearTimeout(timeoutId);
          
          console.log('[tRPC] Response status:', response.status);
          
          if (!response.ok) {
            const contentType = response.headers.get('content-type');
            
            if (response.status === 404) {
              console.error('[tRPC] 404 Error - endpoint not found:', url);
              throw new Error('BACKEND_NOT_FOUND: The backend endpoint was not found. Please verify the API is deployed at https://api.plantsgenius.site');
            }
            
            if (response.status === 500) {
              console.error('[tRPC] 500 Error - server error');
              throw new Error('BACKEND_ERROR: Server error occurred. Please try again later.');
            }
            
            if (contentType?.includes('text/html')) {
              console.error('[tRPC] Received HTML instead of JSON - wrong endpoint or routing issue');
              throw new Error('BACKEND_ERROR: Invalid response from server. Please check API configuration.');
            }
          }

          return response;
        } catch (error: any) {
          console.error('[tRPC] Fetch error:', error.message);
          
          if (error.name === 'AbortError') {
            throw new Error('BACKEND_TIMEOUT: Request timed out after 15 seconds. Please check your internet connection.');
          }
          
          if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
            throw new Error('BACKEND_NETWORK_ERROR: Cannot reach the server. Please check your internet connection and verify the API is running at https://api.plantsgenius.site');
          }
          
          throw error;
        }
      },
    }),
  ],
});
