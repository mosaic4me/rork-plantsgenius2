import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  
  console.log('[tRPC] Environment check:');
  console.log('[tRPC] - EXPO_PUBLIC_API_BASE_URL:', apiUrl || 'NOT SET');
  console.log('[tRPC] - All env vars:', Object.keys(process.env).filter(k => k.startsWith('EXPO_PUBLIC')));
  
  if (apiUrl && apiUrl.trim() !== '') {
    const cleanUrl = apiUrl.trim();
    const finalUrl = cleanUrl.endsWith('/') ? cleanUrl.slice(0, -1) : cleanUrl;
    console.log('[tRPC] ✅ Using configured API URL:', finalUrl);
    return finalUrl;
  }

  console.warn('[tRPC] ⚠️ EXPO_PUBLIC_API_BASE_URL not configured in .env file');
  console.warn('[tRPC] ⚠️ Expected: EXPO_PUBLIC_API_BASE_URL=https://api.plantsgenius.site');
  console.warn('[tRPC] ⚠️ App will run in offline/guest mode with limited features');
  
  return 'https://api.plantsgenius.site';
};

const baseUrl = getBaseUrl();

console.log('[tRPC] 📡 Final tRPC endpoint:', `${baseUrl}/api/trpc`);
console.log('[tRPC] 🔄 Will attempt backend, fallback to direct API if unavailable');

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
            let responseText = '';
            
            try {
              responseText = await response.text();
            } catch (_e) {
              console.error('[tRPC] Could not read response body');
            }
            
            if (response.status === 404) {
              console.warn('[tRPC] Backend endpoint not found - using fallback');
              console.warn('[tRPC] URL attempted:', url);
              console.warn('[tRPC] Response:', responseText);
              throw new Error('BACKEND_NOT_AVAILABLE');
            }
            
            if (response.status === 500) {
              console.warn('[tRPC] Server error - using fallback');
              throw new Error('BACKEND_ERROR');
            }
            
            if (contentType?.includes('text/html')) {
              console.warn('[tRPC] Received HTML - using fallback');
              throw new Error('BACKEND_NOT_AVAILABLE');
            }
          }

          return response;
        } catch (error: any) {
          console.error('[tRPC] Fetch error:', error.message);
          
          if (error.name === 'AbortError') {
            console.warn('[tRPC] Request timeout - using fallback');
            throw new Error('BACKEND_TIMEOUT');
          }
          
          if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
            console.warn('[tRPC] Network error - using fallback');
            throw new Error('BACKEND_NETWORK_ERROR');
          }
          
          throw error;
        }
      },
    }),
  ],
});
