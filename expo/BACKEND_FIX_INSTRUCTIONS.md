# Backend Connection Fix Instructions

## Current Issue
The app is receiving 404 errors when trying to connect to the backend at `https://api.plantsgenius.site/api`

## Errors Observed
- `[Health Check] Backend returned error: 404`
- `[SignUp] Backend is not available: Backend returned 404 error`
- Backend endpoints are returning HTML instead of JSON

## Root Cause
The backend endpoints are not accessible at the expected URLs. This could be due to:
1. Backend routing configuration issue
2. Backend not properly deployed at the domain
3. CORS or HTTP method restrictions
4. Different endpoint structure than expected

## Expected Endpoint Structure
Based on the backend code (`backend/hono.ts`), these endpoints should exist:
- `GET https://api.plantsgenius.site/api` - Root endpoint
- `GET https://api.plantsgenius.site/api/health` - Health check
- `POST https://api.plantsgenius.site/api/auth/signup` - User signup
- `POST https://api.plantsgenius.site/api/auth/signin` - User signin
- `POST https://api.plantsgenius.site/api/trpc/*` - tRPC routes

## How to Fix

### Step 1: Verify Backend is Accessible
Test these URLs manually:

```bash
# Test root endpoint
curl https://api.plantsgenius.site/api

# Test health endpoint
curl https://api.plantsgenius.site/api/health

# Test signup endpoint
curl -X POST https://api.plantsgenius.site/api/auth/signup \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","fullName":"Test User"}'
```

### Step 2: Check Backend Deployment
Verify that:
1. The Hono backend (`backend/hono.ts`) is deployed to `https://api.plantsgenius.site`
2. The `api/[[...route]].ts` file is properly configured to handle all routes
3. CORS is enabled for all origins (already configured in `backend/hono.ts`)

### Step 3: Verify Environment Variable
Check `.env` file has correct backend URL:
```
EXPO_PUBLIC_API_BASE_URL=https://api.plantsgenius.site
```

Note: URL should NOT have trailing slash

### Step 4: Test from App
1. Open the app
2. Go to "Backend Diagnostics" from the auth screen
3. Check the console logs for detailed information about what's being returned

## What I've Fixed in the Code

### 1. Updated `contexts/AuthContext.tsx`
- Removed dependency on health check before authentication
- Added proper URL cleaning (removing trailing slashes)
- Added timeout handlers (15 seconds)
- Added detailed logging of responses
- Better error message handling
- Proper content-type checking

### 2. Updated `utils/backendHealthCheck.ts`
- Added content-type validation
- Better URL handling
- Added cache control headers

### 3. Created `utils/testBackendConnection.ts`
- Comprehensive backend testing utility
- Tests all endpoints with detailed logging
- Will show exactly what the backend is returning

### 4. Updated `app/backend-diagnostic.tsx`
- Now runs comprehensive tests and logs everything to console
- Will help identify the exact issue

## Next Steps

1. **Run the app and check console logs** - The diagnostic screen will now show detailed information
2. **Test the curl commands above** - This will verify if the backend is accessible
3. **Check backend deployment** - Ensure the Hono backend is properly deployed

## Temporary Solution
Users can continue using the app in Guest Mode while the backend connection is being fixed.

## If Backend is Not Deployed
If the backend is not yet deployed at `https://api.plantsgenius.site/api`, you need to:
1. Deploy the Hono backend to a hosting service (Vercel, Cloudflare Workers, etc.)
2. Update `EXPO_PUBLIC_API_BASE_URL` to point to the deployed backend
3. Restart the app

## Testing Auth Without Backend
The app includes Guest Mode which allows users to:
- Scan plants (limited to 2 scans per day)
- Save plants to their garden
- View plant history
- All features except cloud sync and subscriptions
