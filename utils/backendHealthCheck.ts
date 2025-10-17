import { Platform } from 'react-native';

export interface HealthCheckResult {
  isAvailable: boolean;
  message: string;
  details?: {
    endpoint: string;
    responseTime?: number;
    error?: string;
    status?: number;
  };
}

export async function checkBackendHealth(): Promise<HealthCheckResult> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.plantsgenius.site';
  const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const authEndpoint = `${cleanUrl}/api/auth/signin`;
  
  console.log('[Health Check] Checking auth endpoint availability:', authEndpoint);
  console.log('[Health Check] Platform:', Platform.OS);
  
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[Health Check] Timeout triggered after 5 seconds');
      controller.abort();
    }, 5000);
    
    const response = await fetch(authEndpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store' as RequestCache,
      body: JSON.stringify({ email: 'health@check.test', password: 'test' }),
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    console.log('[Health Check] Response received:', {
      status: response.status,
      ok: response.ok,
      responseTime: `${responseTime}ms`,
    });
    
    if (response.status === 401 || response.status === 400 || response.status === 200) {
      console.log('[Health Check] Auth endpoint is responsive');
      
      return {
        isAvailable: true,
        message: 'Backend is online and responding',
        details: {
          endpoint: authEndpoint,
          responseTime,
          status: response.status,
        },
      };
    } else if (response.status === 404) {
      const errorText = await response.text();
      console.warn('[Health Check] Auth endpoint returned 404:', errorText.substring(0, 200));
      
      return {
        isAvailable: false,
        message: 'Authentication endpoint not found',
        details: {
          endpoint: authEndpoint,
          responseTime,
          status: response.status,
          error: 'Auth endpoint returned 404 - API may not be properly configured',
        },
      };
    } else {
      const errorText = await response.text();
      console.error('[Health Check] Unexpected response:', {
        status: response.status,
        body: errorText.substring(0, 200),
      });
      
      return {
        isAvailable: false,
        message: `Backend returned ${response.status} error`,
        details: {
          endpoint: authEndpoint,
          responseTime,
          status: response.status,
          error: errorText.substring(0, 200),
        },
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    console.error('[Health Check] Failed to reach backend:', {
      error: error.message,
      name: error.name,
      responseTime: `${responseTime}ms`,
    });
    
    let message = 'Cannot connect to backend';
    
    if (error.name === 'AbortError') {
      message = 'Backend connection timeout';
    } else if (error.message?.includes('Failed to fetch')) {
      message = 'Network error - backend is unreachable';
    } else if (error.message?.includes('Network request failed')) {
      message = 'Network request failed - check your connection';
    } else {
      message = error.message || 'Unknown error';
    }
    
    return {
      isAvailable: false,
      message,
      details: {
        endpoint: authEndpoint,
        responseTime,
        error: error.message,
      },
    };
  }
}

export async function testBackendConnection(): Promise<void> {
  console.log('[Backend Test] Running comprehensive backend test...');
  
  const result = await checkBackendHealth();
  
  console.log('[Backend Test] Result:', {
    available: result.isAvailable,
    message: result.message,
  });
  
  if (result.details) {
    console.log('[Backend Test] Details:', result.details);
  }
  
  if (!result.isAvailable) {
    console.warn('[Backend Test] ⚠️ Backend auth endpoint not responding as expected');
    console.warn('[Backend Test] Error:', result.message);
    console.warn('[Backend Test] Endpoint tested:', result.details?.endpoint);
    console.warn('[Backend Test] Note: You can still use Guest Mode to explore the app');
  } else {
    console.log('[Backend Test] ✅ Backend auth endpoint is operational');
  }
}
