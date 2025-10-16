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
  console.warn('[tRPC] ⚠️ Expected: EXPO_PUBLIC_API_BASE_URL=https://api.plantsgenius.site/app');
  console.warn('[tRPC] ⚠️ App will run in offline/guest mode with limited features');
  
  return 'https://api.plantsgenius.site/app';
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
          throw new Error('BACKEND_NOT_CONFIGURED: Please set EXPO_PUBLIC_API_BASE_URL to https://api.plantsgenius.site/app or use Guest Mode');
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
          console.log('[tRPC] Response ok:', response.ok);
          
          if (!response.ok) {
            const contentType = response.headers.get('content-type');
            console.log('[tRPC] Content-Type:', contentType);
            let responseText = '';
            
            try {
              responseText = await response.text();
              console.log('[tRPC] Response body:', responseText.substring(0, 500));
            } catch (_e) {
              console.error('[tRPC] Could not read response body');
            }
            
            if (response.status === 404) {
              console.error('[tRPC] ❌ 404 Backend endpoint not found');
              console.error('[tRPC] URL attempted:', url);
              console.error('[tRPC] Expected backend at:', baseUrl);
              console.error('[tRPC] Response:', responseText);
              console.error('[tRPC] Please verify:');
              console.error('[tRPC] 1. Backend is deployed at', baseUrl);
              console.error('[tRPC] 2. EXPO_PUBLIC_API_BASE_URL is set correctly in .env');
              console.error('[tRPC] 3. Backend routes are configured correctly');
              throw new Error('BACKEND_NOT_AVAILABLE');
            }
            
            if (response.status === 500) {
              console.error('[tRPC] ❌ 500 Server error');
              console.error('[tRPC] Response:', responseText);
              throw new Error('BACKEND_ERROR');
            }
            
            if (contentType?.includes('text/html')) {
              console.error('[tRPC] ❌ Received HTML instead of JSON');
              console.error('[tRPC] This usually means the backend endpoint doesn\'t exist');
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
