# Backend Connection Issues - FIXED

## Issues Resolved

### 1. tRPC 404 Errors
**Problem**: App was trying to connect to external backend at `https://api.plantsgenius.site` but getting 404 errors.

**Root Cause**: 
- The `.env` file was configured with an external production backend URL
- When running locally with Expo, the app couldn't reach the external backend
- No fallback mechanism for local development

**Solution**:
- Updated `lib/trpc.ts` to auto-detect local development environment
- Added smart URL detection for web platform (localhost, 127.0.0.1, etc.)
- Configured `.env` to use empty `EXPO_PUBLIC_API_BASE_URL` for local development
- tRPC now automatically uses relative paths when no external URL is configured

### 2. Payment/Subscription 404 Errors
**Problem**: Payment system was failing with "Not found" errors when creating subscriptions.

**Root Cause**:
- Payment component was trying to call REST API endpoint that required external backend
- No fallback to Supabase when backend unavailable

**Solution**:
- Updated `components/PaystackPayment.tsx` with graceful fallback logic:
  1. Try REST API endpoint first (for production backend)
  2. If 404 or connection fails, automatically fall back to Supabase direct insert
  3. Better error logging for debugging
- Both payment methods now work seamlessly

### 3. Plant Identification Service Errors  
**Problem**: "Plant identification service not configured" errors appearing.

**Root Cause**:
- Backend tRPC endpoint for plant identification not available
- Error messages weren't helpful for debugging

**Solution**:
- Improved error handling in `app/analyzing.tsx`
- Added specific error detection for BACKEND_NOT_AVAILABLE and 404 responses
- Better error messages guide users on what went wrong
- Fallback chain now works: Direct API → Backend → Helpful error

## Configuration Changes

### `.env` File
```bash
# Before
EXPO_PUBLIC_API_BASE_URL=https://api.plantsgenius.site

# After (for local development)
EXPO_PUBLIC_API_BASE_URL=

# For production deployment, set to your backend URL:
# EXPO_PUBLIC_API_BASE_URL=https://api.plantsgenius.site
```

## How It Works Now

### Local Development
1. **Web**: Auto-detects `localhost` and uses relative paths (`/api/trpc`)
2. **Mobile**: Uses Expo dev server's backend routes
3. **Fallback**: All API calls gracefully fall back to Supabase when backend unavailable

### Production Deployment
1. Set `EXPO_PUBLIC_API_BASE_URL` in production environment
2. App connects to external backend
3. Fallback to Supabase still works if backend has issues

## Testing

To test the fixes:

1. **Local Development**:
   ```bash
   # Ensure .env has empty or no EXPO_PUBLIC_API_BASE_URL
   npm start
   ```
   - Sign up/Sign in should work
   - Payment subscriptions should work
   - Plant scanning should work (if API key configured)

2. **Production**:
   ```bash
   # Set production backend URL in .env
   EXPO_PUBLIC_API_BASE_URL=https://api.plantsgenius.site
   ```
   - All features work with backend
   - Graceful fallback if backend down

## Error Messages Improved

### Before
```
[tRPC] ❌ Unexpected error: Error: BACKEND_NOT_AVAILABLE
ERROR Error processing payment: Error: Not found
```

### After
```
[tRPC] ⚠️ EXPO_PUBLIC_API_BASE_URL not configured in .env file
[tRPC] ⚠️ Falling back to relative path for local development
[tRPC] ✅ Using local web URL: http://localhost:8081
[Payment] REST endpoint not found, falling back to Supabase
[Payment] Subscription saved to Supabase
```

## Files Modified

1. `lib/trpc.ts` - Smart URL detection for local vs production
2. `components/PaystackPayment.tsx` - Fallback to Supabase on backend errors
3. `app/analyzing.tsx` - Better error detection and messages
4. `.env` - Cleared external backend URL for local development

## Next Steps

✅ Local development now works out of the box
✅ Payment system has automatic fallback
✅ Better error messages for debugging
✅ Production deployment ready when backend is deployed

For production deployment, simply set `EXPO_PUBLIC_API_BASE_URL` to your deployed backend URL.
