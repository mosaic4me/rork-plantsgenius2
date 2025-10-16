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
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.plantsgenius.site/app';
  const healthEndpoint = `${baseUrl}/health`;
  
  console.log('[Health Check] Starting health check for:', healthEndpoint);
  console.log('[Health Check] Platform:', Platform.OS);
  
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[Health Check] Timeout triggered after 10 seconds');
      controller.abort();
    }, 10000);
    
    const response = await fetch(healthEndpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    console.log('[Health Check] Response received:', {
      status: response.status,
      ok: response.ok,
      responseTime: `${responseTime}ms`,
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('[Health Check] Backend is healthy:', data);
      
      return {
        isAvailable: true,
        message: 'Backend is online and responding',
        details: {
          endpoint: healthEndpoint,
          responseTime,
          status: response.status,
        },
      };
    } else {
      const errorText = await response.text();
      console.error('[Health Check] Backend returned error:', {
        status: response.status,
        body: errorText.substring(0, 200),
      });
      
      return {
        isAvailable: false,
        message: `Backend returned ${response.status} error`,
        details: {
          endpoint: healthEndpoint,
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
        endpoint: healthEndpoint,
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
    console.warn('[Backend Test] ⚠️ Backend is not available');
    console.warn('[Backend Test] Recommendations:');
    console.warn('[Backend Test] 1. Verify EXPO_PUBLIC_API_BASE_URL in .env');
    console.warn('[Backend Test] 2. Check if backend is deployed at:', result.details?.endpoint);
    console.warn('[Backend Test] 3. Test the URL in a browser to verify it works');
    console.warn('[Backend Test] 4. Check for CORS configuration on the backend');
    console.warn('[Backend Test] 5. Use Guest Mode to continue without backend');
  } else {
    console.log('[Backend Test] ✅ Backend is operational');
  }
}
