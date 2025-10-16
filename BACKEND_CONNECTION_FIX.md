# Backend Connection Fix - Network Errors

## Problem Summary
The app was encountering `BACKEND_NETWORK_ERROR` when trying to connect to the authentication backend at `https://api.plantsgenius.site/app/api/trpc`.

## Root Cause Analysis
The error "Failed to fetch" typically indicates one of the following issues:
1. **Backend Not Deployed**: The backend server is not running at the specified URL
2. **CORS Configuration**: The backend is not allowing requests from the app's origin
3. **Network Issues**: Internet connectivity problems or SSL/TLS certificate issues
4. **Wrong URL Configuration**: The API base URL is incorrect or malformed

## Changes Made

### 1. Enhanced tRPC Error Handling (`lib/trpc.ts`)
- ✅ Added comprehensive logging for network requests
- ✅ Extended timeout from 15s to 30s for slower connections
- ✅ Added CORS mode configuration
- ✅ Better error messages with diagnostic information
- ✅ Platform-specific handling (web vs mobile)

### 2. Backend Health Check Utility (`utils/backendHealthCheck.ts`)
- ✅ Created health check function to test backend connectivity
- ✅ Tests the `/health` endpoint with proper timeout handling
- ✅ Provides detailed diagnostic information
- ✅ Helps identify specific connection issues

### 3. Updated Auth Context (`contexts/AuthContext.tsx`)
- ✅ Added health check before authentication attempts
- ✅ Better error messages for users
- ✅ Prevents unnecessary API calls when backend is down
- ✅ Improved error handling and user feedback

### 4. Backend Diagnostic Screen (`app/backend-diagnostic.tsx`)
- ✅ New diagnostic screen accessible from auth page
- ✅ Tests environment variables configuration
- ✅ Tests backend health endpoint
- ✅ Tests tRPC endpoint connectivity
- ✅ Tests general internet connectivity
- ✅ Provides recommendations for fixing issues

### 5. Updated Auth Screen (`app/auth.tsx`)
- ✅ Added "Backend Diagnostics" link for debugging
- ✅ Users can access diagnostics to troubleshoot connection issues

### 6. Updated Environment Config (`.env`)
- ✅ Added detailed comments about backend URL format
- ✅ Clarified that URL should not end with trailing slash

## How to Test

### 1. Access Backend Diagnostics
1. Open the app and go to the Auth screen
2. Click "Backend Diagnostics" link at the bottom
3. View the diagnostic results for each test
4. Check which tests are failing

### 2. Check Console Logs
The enhanced logging will show detailed information:
```
[tRPC] 🔄 Request starting: https://api.plantsgenius.site/app/api/trpc/...
[tRPC] 📤 Method: POST
[tRPC] 📋 Request headers: Content-Type, Accept, Origin
[tRPC] ✅ Response received: { status: 200, ok: true, ... }
```

Or error logs:
```
[tRPC] ❌ Fetch error occurred:
[tRPC] Error name: TypeError
[tRPC] Error message: Failed to fetch
[tRPC] 🌐 Network error - possible causes:
[tRPC] 1. Backend server is down or not deployed
[tRPC] 2. CORS issues preventing the request
[tRPC] 3. Internet connection issues
[tRPC] 4. SSL/TLS certificate issues
```

## Next Steps to Fix

### If Backend is Not Deployed
1. Verify the backend is deployed at `https://api.plantsgenius.site/app`
2. Test the health endpoint manually: `https://api.plantsgenius.site/app/health`
3. Should return: `{"status":"ok","message":"Backend is healthy"}`

### If CORS Issues
The backend should have CORS configured to allow requests from your app's origin:
```typescript
app.use("*", cors({
  origin: '*',  // or specific origins
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
```

### If Wrong URL
1. Check `.env` file has: `EXPO_PUBLIC_API_BASE_URL=https://api.plantsgenius.site/app`
2. Restart the dev server after changing .env
3. Verify the URL is correct by opening it in a browser

### If SSL/TLS Issues
1. Ensure the backend has a valid SSL certificate
2. Test the URL in a browser - it should show a lock icon
3. For development, you might need to add the certificate to trusted roots

## Temporary Workaround
Users can continue using the app in Guest Mode while backend issues are resolved:
1. Click "Continue as Guest" on the auth screen
2. This provides access to basic features without authentication
3. Users get 2 free scans per day in guest mode

## Testing Checklist
- [ ] Backend is deployed and accessible
- [ ] Health endpoint returns 200 OK
- [ ] tRPC endpoint responds (even 404 for GET is okay)
- [ ] CORS headers are present in responses
- [ ] SSL certificate is valid
- [ ] Environment variables are correct
- [ ] App can reach the backend successfully

## Support
If backend connection issues persist:
1. Run the Backend Diagnostics screen
2. Check all console logs for detailed error messages
3. Verify backend deployment status
4. Test the backend URLs manually in a browser
5. Check server logs for incoming requests
