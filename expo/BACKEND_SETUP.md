# Backend Setup Guide

## Current Status

Your PlantGenius app has a backend with tRPC API and MongoDB integration. The backend is now **properly configured** and should be automatically served by Rork at `/api/*` endpoints. The app will work in **Guest Mode** if the backend is unavailable.

## What Works Without Backend

- ✅ Guest Mode (2 free scans per day, stored locally)
- ✅ Plant scanning and identification
- ✅ Viewing scan history (stored locally)
- ✅ All UI features

## What Requires Backend

- ❌ User authentication (Sign Up / Sign In)
- ❌ Cloud-synced scan history
- ❌ Premium subscriptions
- ❌ Cross-device data sync

## Backend Architecture

Your backend is built with:
- **Hono** - Fast web framework
- **tRPC** - Type-safe API
- **MongoDB** - Database for users, subscriptions, and scans
- **bcryptjs** - Password hashing

## How to Verify the Backend

### Step 1: Check if Backend is Running

The backend is automatically served by Rork through the `api/[[...route]].ts` file.

**Test the backend:**
1. Open your app URL in a browser: `https://dev-mnpy11q8bq72djea4297w.rorktest.dev`
2. Navigate to: `https://dev-mnpy11q8bq72djea4297w.rorktest.dev/api`
3. You should see:
   ```json
   {
     "status": "ok",
     "message": "PlantGenius Backend API is running",
     "version": "1.0.0",
     "endpoints": {
       "health": "/api/trpc/health.check",
       "auth": "/api/trpc/auth.*",
       "scans": "/api/trpc/scans.*"
     },
     "timestamp": "..."
   }
   ```

4. Test the health endpoint: `https://dev-mnpy11q8bq72djea4297w.rorktest.dev/api/health`
5. You should see:
   ```json
   {
     "status": "ok",
     "message": "Backend is healthy",
     "timestamp": "..."
   }
   ```

If you see these responses, the backend is working! If authentication still fails, it's likely a MongoDB connection issue.

### Step 2: Verify MongoDB Connection

Your MongoDB connection string is hardcoded in `lib/mongodb.ts`:
```
mongodb+srv://plantgen:Newjab101>@cluster102.vvngq7e.mongodb.net/
```

**To fix MongoDB issues:**

1. **Check MongoDB Atlas:**
   - Log into [MongoDB Atlas](https://cloud.mongodb.com)
   - Verify the cluster `Cluster102` is running
   - Check that the database `plantgenius` exists

2. **Verify Network Access:**
   - In MongoDB Atlas, go to Network Access
   - Add `0.0.0.0/0` to allow all IPs (for testing)
   - Or add your deployment server's IP

3. **Verify Database User:**
   - In MongoDB Atlas, go to Database Access
   - Ensure user `plantgen` exists with password `Newjab101>`
   - Grant read/write permissions to `plantgenius` database

4. **Test Connection:**
   - Try accessing: `https://your-app-url.rorktest.dev/api/trpc/health.check`
   - Should return: `{"status":"ok","mongodb":"connected"}`

### Option 3: Use Environment Variables (Recommended for Production)

Instead of hardcoding credentials, set environment variables:

1. Set `MONGODB_URI` in your deployment environment
2. Set `MONGODB_DB` to your database name
3. Remove hardcoded credentials from `lib/mongodb.ts`

## Testing the Backend

### Test Health Check
```bash
curl https://your-app-url.rorktest.dev/api/trpc/health.check
```

### Test Sign Up
```bash
curl -X POST https://your-app-url.rorktest.dev/api/trpc/auth.signUp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","fullName":"Test User"}'
```

## Troubleshooting

### "Failed to fetch" Error
- Backend is not deployed or not accessible
- Check that Rork is serving the backend
- Verify the URL in browser console logs

### "Backend service is not available" Error
- Backend is deployed but returning 404
- Check that `/api/trpc` routes are properly configured
- Verify Hono app is exported correctly in `backend/hono.ts`

### "MongoDB connection failed" Error
- MongoDB Atlas cluster is paused or deleted
- Network access rules are blocking connections
- Database credentials are incorrect
- Connection string is malformed

### "Authentication service is currently unavailable" Error
- This is the user-friendly message shown when backend is down
- Users can still use Guest Mode
- Fix backend deployment to enable authentication

## Guest Mode vs Authenticated Mode

| Feature | Guest Mode | Authenticated Mode |
|---------|-----------|-------------------|
| Daily Scans | 2 per day | 2 per day (basic) / Unlimited (premium) |
| Scan History | Local only | Cloud-synced |
| Cross-device | ❌ No | ✅ Yes |
| Data Backup | ❌ No | ✅ Yes |
| Premium Features | ❌ No | ✅ Yes |

## Next Steps

1. **Verify MongoDB is accessible** - Check Atlas dashboard
2. **Test backend health endpoint** - Confirm API is responding
3. **Try creating a test account** - Use the app's Sign Up
4. **Check console logs** - Look for detailed error messages
5. **Contact Rork support** - If backend routing issues persist

## Support

If you continue to see authentication errors:
1. Check the browser console for detailed logs (all errors are logged with `[tRPC]`, `[MongoDB]`, `[SignUp]`, `[SignIn]` prefixes)
2. Verify MongoDB Atlas is properly configured
3. Ensure Rork is serving the backend endpoints
4. Users can always use Guest Mode to explore the app

---

**Note:** The app is designed to work gracefully without the backend. All errors now show user-friendly messages and guide users to Guest Mode.
