import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { Platform } from "react-native";

const requestQueue: Array<() => Promise<any>> = [];
let isProcessingQueue = false;
const REQUEST_DELAY = 300;

const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (request) {
      try {
        await request();
      } catch (error) {
        console.error('[Queue] Request failed:', error);
      }
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }
  }

  isProcessingQueue = false;
};

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  
  console.log('[tRPC] Environment check:');
  console.log('[tRPC] - EXPO_PUBLIC_API_BASE_URL:', apiUrl || 'NOT SET');
  console.log('[tRPC] - Platform:', Platform.OS);
  
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

const customFetch = async (url: string, options: any) => {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        console.log('[tRPC] 🔄 Request starting:', url);
        console.log('[tRPC] 📤 Method:', options?.method || 'GET');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[tRPC] ⏱️ Request timeout triggered');
      controller.abort();
    }, 30000);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options?.headers || {}),
    };
    
    if (Platform.OS === 'web') {
      headers['Origin'] = typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
    }
    
    console.log('[tRPC] 📋 Request headers:', Object.keys(headers).join(', '));
    
    const fetchOptions = {
      ...options,
      signal: controller.signal,
      headers,
      mode: 'cors' as RequestMode,
    };
    
    const response = await fetch(url, fetchOptions);
    
    clearTimeout(timeoutId);
    
    console.log('[tRPC] ✅ Response received:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
    });
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let responseText = '';
      
      try {
        responseText = await response.text();
        console.log('[tRPC] ❌ Error response body:', responseText.substring(0, 500));
      } catch (_e) {
        console.error('[tRPC] Could not read response body');
      }
      
      if (response.status === 404) {
        console.error('[tRPC] ❌ 404 - Backend endpoint not found');
        console.error('[tRPC] Verify backend is deployed at:', baseUrl);
        throw new Error('BACKEND_NOT_AVAILABLE');
      }
      
      if (response.status === 500) {
        console.error('[tRPC] ❌ 500 - Server error');
        throw new Error('BACKEND_ERROR');
      }
      
      if (response.status === 429) {
        console.error('[tRPC] ❌ Rate Limited (429) - Too Many Requests');
        console.error('[tRPC] Backend is rate limiting requests. Implement throttling.');
        throw new Error('RATE_LIMITED');
      }
      
      if (response.status === 0 || response.status >= 400) {
        console.error('[tRPC] ❌ HTTP Error:', response.status);
        throw new Error(`HTTP_ERROR_${response.status}`);
      }
      
      if (contentType?.includes('text/html')) {
        console.error('[tRPC] ❌ Received HTML instead of JSON');
        throw new Error('BACKEND_NOT_AVAILABLE');
      }
    }

        resolve(response);
      } catch (error: any) {
        console.error('[tRPC] ❌ Fetch error occurred:');
        console.error('[tRPC] Error name:', error.name);
        console.error('[tRPC] Error message:', error.message);
        console.error('[tRPC] Error stack:', error.stack?.substring(0, 200));
    
    if (error.name === 'AbortError') {
      console.error('[tRPC] ⏱️ Request timeout after 30 seconds');
      throw new Error('BACKEND_TIMEOUT');
    }
    
    if (error.message?.includes('Failed to fetch')) {
      console.error('[tRPC] 🌐 Network error - possible causes:');
      console.error('[tRPC] 1. Backend server is down or not deployed');
      console.error('[tRPC] 2. CORS issues preventing the request');
      console.error('[tRPC] 3. Internet connection issues');
      console.error('[tRPC] 4. SSL/TLS certificate issues');
      throw new Error('BACKEND_NETWORK_ERROR');
    }
    
        if (error.message?.includes('Network request failed')) {
          console.error('[tRPC] 🌐 Network request failed (mobile)');
          reject(new Error('BACKEND_NETWORK_ERROR'));
          return;
        }
        
        reject(error);
      }
    });
    processQueue();
  });
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: baseUrl ? `${baseUrl}/api/trpc` : '/api/trpc',
      transformer: superjson,
      fetch: customFetch as any,
    }),
  ],
});
