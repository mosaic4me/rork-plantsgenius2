import { Platform } from 'react-native';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.plantsgenius.site').replace(/\/$/, '');

export async function testBackendConnection() {
  console.log('='.repeat(60));
  console.log('[Backend Test] Starting comprehensive backend connectivity test');
  console.log('[Backend Test] Platform:', Platform.OS);
  console.log('[Backend Test] API Base URL:', API_BASE_URL);
  console.log('='.repeat(60));

  const endpoints = [
    { name: 'Root', url: API_BASE_URL, method: 'GET' },
    { name: 'Health', url: `${API_BASE_URL}/health`, method: 'GET' },
    { name: 'API Health', url: `${API_BASE_URL}/api/health`, method: 'GET' },
    { name: 'API Root', url: `${API_BASE_URL}/api`, method: 'GET' },
  ];

  for (const endpoint of endpoints) {
    console.log('\n' + '-'.repeat(60));
    console.log(`[Backend Test] Testing ${endpoint.name}: ${endpoint.url}`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      let body = '';
      
      if (contentType?.includes('application/json')) {
        const json = await response.json();
        body = JSON.stringify(json, null, 2);
      } else {
        const text = await response.text();
        body = text.substring(0, 300);
      }

      console.log(`[Backend Test] ✅ ${endpoint.name} Response:`);
      console.log('  Status:', response.status);
      console.log('  OK:', response.ok);
      console.log('  Content-Type:', contentType);
      console.log('  Body:', body);
    } catch (error: any) {
      console.log(`[Backend Test] ❌ ${endpoint.name} Error:`);
      console.log('  Error Name:', error.name);
      console.log('  Error Message:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('[Backend Test] Testing Auth Endpoints');
  console.log('='.repeat(60));

  const testSignup = {
    email: 'test' + Date.now() + '@test.com',
    password: 'testpassword123',
    fullName: 'Test User',
  };

  console.log('\n' + '-'.repeat(60));
  console.log('[Backend Test] Testing Signup:', `${API_BASE_URL}/api/auth/signup`);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify(testSignup),
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    let body = '';
    
    if (contentType?.includes('application/json')) {
      const json = await response.json();
      body = JSON.stringify(json, null, 2);
    } else {
      const text = await response.text();
      body = text.substring(0, 300);
    }

    console.log('[Backend Test] ✅ Signup Response:');
    console.log('  Status:', response.status);
    console.log('  OK:', response.ok);
    console.log('  Content-Type:', contentType);
    console.log('  Body:', body);
  } catch (error: any) {
    console.log('[Backend Test] ❌ Signup Error:');
    console.log('  Error Name:', error.name);
    console.log('  Error Message:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('[Backend Test] Test Complete');
  console.log('='.repeat(60));
}

export async function quickBackendCheck(): Promise<{
  available: boolean;
  message: string;
  details?: any;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        available: true,
        message: 'Backend is available',
        details: data,
      };
    } else {
      const text = await response.text();
      return {
        available: false,
        message: `Backend returned status ${response.status}`,
        details: { status: response.status, body: text.substring(0, 200) },
      };
    }
  } catch (error: any) {
    return {
      available: false,
      message: error.message || 'Backend connection failed',
      details: { error: error.name, message: error.message },
    };
  }
}
