# PlantsGenius Implementation Summary

## Completed Tasks

### 1. Environment Variables (.env file created)
- ✅ Created .env file with all credentials
- ✅ Updated lib/trpc.ts to use EXPO_PUBLIC_API_BASE_URL
- ✅ Updated lib/supabase.ts to use environment variables
- ✅ Updated utils/plantIdApi.ts to use environment variables
- ✅ Production API configured: https://api.plantsgenius.site/api

## Critical Remaining Tasks

### 2. Google OAuth Implementation
**Location:** app/auth.tsx
- Add expo-auth-session and @react-native-google-signin/google-signin packages
- Add Google Sign-In button with official Google logo
- Route Android users to Google OAuth
- Route iOS users to both Apple Sign In and Google Sign In
- Configure OAuth URLs in .env file

### 3. Apple Sign In
**Location:** app/auth.tsx
- Add expo-apple-authentication package
- Implement Apple Sign In for iOS
- Hide for Android users

### 4. Payment Integration
**Location:** Create new files
- Create `utils/payments/googlePay.ts` for Android
- Create `utils/payments/applePay.ts` for iOS
- Update components/PaystackPayment.tsx for West Africa routing
- Add payment method selection based on Platform and location

### 5. Currency Conversion
**Location:** Create utils/currency.ts
- Implement location detection using expo-location
- Fetch currency rates from FreeCurrencyAPI
- Round converted amounts to nearest 100
- Default to USD

### 6. Profile Page Updates
**Location:** app/(tabs)/profile.tsx
**Changes:**
- Display remaining subscription days
- Show plan type (Free/Basic/Premium) with perks
- Restrict email editing (keep it disabled)
- Allow only name and avatar editing
- Add "Earn a Free Scan" button when scans exhausted

### 7. Billing Page
**Location:** Create app/billing.tsx
**Features:**
- Current plan details
- Billing information
- Payment history
- Remaining subscription days
- Upgrade/downgrade options
- Scan count tracking (daily + total remaining)

### 8. Scan Quota Management
**Location:** app/(tabs)/scan.tsx, contexts/AuthContext.tsx
**Changes:**
- Block camera launch when quota exhausted
- Show notification directing to "Earn a Free Scan"
- Implement 60-second ad watch for one free scan
- Update scan counter after ad completion

### 9. Ad Integration (Google AdMob)
**Location:** components/InterstitialAd.tsx, components/AdBanner.tsx
**Changes:**
- Integrate react-native-google-mobile-ads
- Add ad exit functionality (forfeit reward if exited early)
- Control ads via EXPO_PUBLIC_ADMOB_ENABLED flag
- Implement rewarded ads for earning free scans

### 10. Settings Page
**Location:** app/settings.tsx
**Changes:**
- ✅ Remove blank button under "Scan Usage" section
- Hide password reset for OAuth users
- Show password reset only for email/password users

### 11. Dashboard Text Updates
**Location:** app/(tabs)/index.tsx
**Changes:**
- Change "Community - connect with plant lovers" to "Community - connect with plant lovers (Coming Soon)"
- Remove "Plant identification powered by plantid" text

### 12. Garden Feature Enhancement
**Location:** app/(tabs)/garden.tsx, contexts/AppContext.tsx
**Changes:**
- Store complete watering history for each plant
- Make history viewable by tapping individual plants
- Display watering timestamps and frequency

### 13. Download Permission Handling
**Location:** app/results.tsx (or wherever downloads occur)
**Changes:**
- Add expo-media-library permission prompts
- Request storage permission on download click
- Handle Android & iOS separately

### 14. Splash Screen Redesign
**Location:** app.json, create custom splash component
**Changes:**
- Design engaging splash with plant imagery
- Add interactive elements
- Create anticipatory UX

### 15. Notification Font Size
**Location:** Toast configuration
**Changes:**
- Increase all notification text by 60%
- Update Toast.show() configurations globally

## Package Installation Needed

```bash
bun add @react-native-google-signin/google-signin
bun add expo-apple-authentication
bun add expo-auth-session
bun add react-native-google-mobile-ads
```

## Environment Variables Required

User must configure these in .env:
- EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
- EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
- EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
- EXPO_PUBLIC_APPLE_CLIENT_ID
- EXPO_PUBLIC_GOOGLE_PAY_MERCHANT_ID
- EXPO_PUBLIC_APPLE_PAY_MERCHANT_ID
- EXPO_PUBLIC_ADMOB_* (all AdMob IDs)
- EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY (configured)

## API Documentation Reference
- API Base: https://api.plantsgenius.site/api
- Documentation: https://app.gitbook.com/o/bGzRSCDZPZPoZGYDqihw/s/tFVMGP9J0b3cLQVDCOtm/

## Security Notes
- All credentials moved to .env file
- .env file should be added to .gitignore
- Never commit credentials to repository
- Use different keys for development and production
