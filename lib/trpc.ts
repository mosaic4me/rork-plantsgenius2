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

console.log('[tRPC] Final tRPC endpoint:', `${baseUrl}/api/trpc`);
console.log('[tRPC] Backend status: READY');
console.log('[tRPC] Authentication and cloud features: AVAILABLE');

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
              console.error('[tRPC] The backend is not deployed or not responding');
              console.error('[tRPC] Expected endpoint: https://api.plantsgenius.site/api/trpc');
              throw new Error('BACKEND_NOT_AVAILABLE: The authentication service is not currently available. The backend may not be deployed yet. Please use Guest Mode to explore the app.');
            }
            
            if (response.status === 500) {
              console.error('[tRPC] 500 Error - server error');
              throw new Error('BACKEND_ERROR: Server encountered an error. Please try again later or use Guest Mode.');
            }
            
            if (contentType?.includes('text/html')) {
              console.error('[tRPC] Received HTML instead of JSON - wrong endpoint or routing issue');
              console.error('[tRPC] This usually means the backend is not properly deployed');
              throw new Error('BACKEND_NOT_AVAILABLE: Invalid response from server. The backend may not be deployed correctly. Please use Guest Mode.');
            }
          }

          return response;
        } catch (error: any) {
          console.error('[tRPC] Fetch error:', error.message);
          
          if (error.name === 'AbortError') {
            throw new Error('BACKEND_TIMEOUT: Request timed out after 15 seconds. Please check your internet connection.');
          }
          
          if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
            console.error('[tRPC] Network error - cannot reach backend');
            console.error('[tRPC] This could mean: no internet, backend not deployed, or CORS issues');
            throw new Error('BACKEND_NETWORK_ERROR: Cannot connect to the authentication service. Please check your internet connection or use Guest Mode.');
          }
          
          throw error;
        }
      },
    }),
  ],
});
