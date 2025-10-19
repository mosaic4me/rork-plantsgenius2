import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { Platform } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  
  console.log('[tRPC] Environment check:');
  console.log('[tRPC] - EXPO_PUBLIC_API_BASE_URL:', apiUrl || 'NOT SET');
  console.log('[tRPC] - Platform:', Platform.OS);
  
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      console.log('[tRPC] Web hostname:', hostname);
      
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('.local')) {
        const localUrl = `${window.location.protocol}//${window.location.host}`;
        console.log('[tRPC] ✅ Using local web URL:', localUrl);
        return localUrl;
      }
    }
  }
  
  if (apiUrl && apiUrl.trim() !== '') {
    const cleanUrl = apiUrl.trim();
    const finalUrl = cleanUrl.endsWith('/') ? cleanUrl.slice(0, -1) : cleanUrl;
    console.log('[tRPC] ✅ Using configured API URL:', finalUrl);
    return finalUrl;
  }

  console.warn('[tRPC] ⚠️ EXPO_PUBLIC_API_BASE_URL not configured in .env file');
  console.warn('[tRPC] ⚠️ Falling back to relative path for local development');
  
  return '';
};

const baseUrl = getBaseUrl();

console.log('[tRPC] 📡 Final tRPC endpoint:', `${baseUrl}/api/trpc`);

const customFetch = async (url: string, options: any) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('[tRPC] ⏱️ Request timeout triggered');
    controller.abort();
  }, 30000);
  
  try {
    let token: string | null = null;
    try {
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        token = await AsyncStorage.getItem('authToken');
      } else {
        token = await SecureStore.getItemAsync('authToken');
      }
    } catch (error) {
      console.log('[tRPC] Could not access auth token:', error);
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options?.headers || {}),
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (Platform.OS === 'web') {
      headers['Origin'] = typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
    }
    
    const fetchOptions = {
      ...options,
      signal: controller.signal,
      headers,
      mode: 'cors' as RequestMode,
    };
    
    const response = await fetch(url, fetchOptions);
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (response.status === 404) {
        console.error('[tRPC] ❌ 404 - Backend endpoint not found');
        console.error('[tRPC] Verify backend is deployed at:', baseUrl);
        console.log('[tRPC] ℹ️ Falling back to direct API calls');
        throw new Error('BACKEND_NOT_AVAILABLE');
      }
      
      if (response.status === 500) {
        console.error('[tRPC] ❌ 500 - Server error');
        throw new Error('BACKEND_ERROR');
      }
      
      if (response.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      
      if (response.status === 0 || response.status >= 400) {
        console.error('[tRPC] ❌ HTTP Error:', response.status);
        throw new Error(`HTTP_ERROR_${response.status}`);
      }
      
      if (contentType?.includes('text/html')) {
        console.error('[tRPC] ❌ Received HTML instead of JSON');
        console.log('[tRPC] ℹ️ Falling back to direct API calls');
        throw new Error('BACKEND_NOT_AVAILABLE');
      }
    }

    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error('[tRPC] ⏱️ Request timed out after 30 seconds');
      throw new Error('BACKEND_TIMEOUT');
    }
    
    if (error.message?.includes('Failed to fetch')) {
      console.error('[tRPC] ❌ Network error - failed to fetch');
      console.log('[tRPC] ℹ️ Falling back to direct API calls');
      throw new Error('BACKEND_NETWORK_ERROR');
    }
    
    if (error.message?.includes('Network request failed')) {
      console.error('[tRPC] ❌ Network request failed');
      console.log('[tRPC] ℹ️ Falling back to direct API calls');
      throw new Error('BACKEND_NETWORK_ERROR');
    }
    
    console.error('[tRPC] ❌ Unexpected error:', error);
    throw error;
  }
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
