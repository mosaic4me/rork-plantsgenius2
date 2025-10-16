# PlantsGenius - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Bun package manager
- Expo Go app (for testing)
- Physical iOS/Android device (recommended)

### Initial Setup

```bash
# 1. Install dependencies
bun install

# 2. Create environment file
cp .env.example .env

# 3. Edit .env with your credentials
# Open .env in your editor and fill in all values
```

### Running the App

```bash
# Start development server
bun start

# For web testing
bun start-web

# Scan QR code with Expo Go app on your device
```

## ✅ What's Already Done

1. **Environment Configuration**
   - `.env` file created with all variables
   - All hardcoded credentials removed
   - Production API configured

2. **Security**
   - `.env` added to `.gitignore`
   - API keys protected
   - Production-ready setup

3. **UI Updates**
   - Dashboard text updated ("Coming Soon" added)
   - Settings page cleaned up (blank button removed)
   - All environment variables integrated

4. **API Integration**
   - Production API: https://api.plantsgenius.site/api
   - PlantNet API configured
   - Supabase configured
   - Currency API ready

## 📦 Required Next Steps

### 1. Install OAuth Packages (Priority 1)

```bash
bun add @react-native-google-signin/google-signin
bun add expo-apple-authentication
bun add expo-auth-session
```

**Then update app.json:**
```json
{
  "expo": {
    "plugins": [
      "@react-native-google-signin/google-signin",
      "expo-apple-authentication"
    ]
  }
}
```

### 2. Install Payment Packages (Priority 2)

```bash
bun add react-native-google-pay
# Apple Pay is built into React Native
```

### 3. Install AdMob (Priority 3)

```bash
bun add react-native-google-mobile-ads
```

**Note:** AdMob requires a development build (not Expo Go)

```bash
# Build development version
eas build --profile development --platform android
eas build --profile development --platform ios
```

## 🔧 Configuration Steps

### Step 1: Configure OAuth

1. **Google OAuth:**
   - Go to https://console.cloud.google.com/
   - Create OAuth 2.0 credentials
   - Add to `.env`:
     ```
     EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx
     EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxx
     EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxx
     ```

2. **Apple Sign In:**
   - Go to https://developer.apple.com/
   - Configure Sign in with Apple
   - Add to `.env`:
     ```
     EXPO_PUBLIC_APPLE_CLIENT_ID=xxx
     ```

### Step 2: Configure Payments

1. **Google Pay:**
   - Set up merchant at https://pay.google.com/business/console
   - Add merchant ID to `.env`

2. **Apple Pay:**
   - Configure in Apple Developer Portal
   - Add merchant ID to `.env`

3. **Paystack:**
   - Sign up at https://paystack.com/
   - Get API keys from dashboard
   - Update `.env` with public key

### Step 3: Configure AdMob

1. Create AdMob account: https://admob.google.com/
2. Create app in AdMob console
3. Create ad units (Banner, Interstitial, Rewarded)
4. Add all IDs to `.env`
5. Set `EXPO_PUBLIC_ADMOB_ENABLED=true` when ready

## 📱 Testing Checklist

### Basic Functionality
- [ ] App starts without errors
- [ ] Can navigate between tabs
- [ ] Dashboard displays correctly
- [ ] Camera opens for scanning
- [ ] Plant identification works

### Authentication
- [ ] Email/password signup works
- [ ] Email/password login works
- [ ] Guest mode works
- [ ] Sign out works

### To Test After OAuth Setup
- [ ] Google Sign-In (Android)
- [ ] Google + Apple Sign-In (iOS)
- [ ] Profile displays auth provider
- [ ] Password reset hidden for OAuth users

### To Test After Payment Setup
- [ ] Can view subscription plans
- [ ] Can process test payment
- [ ] Subscription status updates
- [ ] Scan limits apply correctly

### To Test After AdMob Setup
- [ ] Ads display correctly
- [ ] Can earn free scan by watching ad
- [ ] Ad exit forfeits reward
- [ ] Subscribers see no ads

## 🐛 Common Issues

### Issue: "Cannot find module '.env'"
**Solution:** Make sure you created `.env` from `.env.example`

### Issue: "OAuth not working"
**Solution:** 
1. Check credentials in `.env`
2. Verify OAuth redirect URLs configured
3. Check package installation

### Issue: "Ads not showing"
**Solution:**
1. AdMob requires development build (not Expo Go)
2. Check `EXPO_PUBLIC_ADMOB_ENABLED=true`
3. Verify ad unit IDs are correct

### Issue: "Backend not found"
**Solution:**
1. Check `EXPO_PUBLIC_API_BASE_URL` in `.env`
2. Verify backend is running at https://api.plantsgenius.site/api
3. Check network connection

### Issue: "Plant identification fails"
**Solution:**
1. Check PlantNet API key in `.env`
2. Verify image is valid
3. Check network connection

## 📚 Documentation Links

- **Setup Guide:** `SETUP_INSTRUCTIONS.md` (detailed implementation)
- **Project Status:** `PROJECT_STATUS.md` (progress tracking)
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY.md` (technical details)

## 🔗 Important URLs

- **Backend API:** https://api.plantsgenius.site/api
- **API Documentation:** https://app.gitbook.com/o/bGzRSCDZPZPoZGYDqihw/s/tFVMGP9J0b3cLQVDCOtm/
- **Support Email:** info@programmerscourt.com

## 💡 Development Tips

1. **Use Test Mode First**
   - Use test API keys during development
   - Switch to production keys before app store submission

2. **Test on Real Devices**
   - OAuth works better on physical devices
   - Payment testing requires real devices
   - AdMob requires development build

3. **Check Logs**
   - Use `console.log` statements to debug
   - Check terminal for backend errors
   - Monitor network requests

4. **Incremental Testing**
   - Test each feature after implementation
   - Don't wait until everything is done
   - Fix issues early

## 🎯 Next Milestones

### Milestone 1: Authentication Complete
- [ ] Install OAuth packages
- [ ] Configure credentials
- [ ] Implement Google Sign-In
- [ ] Implement Apple Sign-In
- [ ] Test all auth flows

### Milestone 2: Payments Complete
- [ ] Install payment packages
- [ ] Configure merchant accounts
- [ ] Implement payment flows
- [ ] Test with test cards
- [ ] Verify subscription updates

### Milestone 3: Ads Complete
- [ ] Create development build
- [ ] Configure AdMob
- [ ] Implement ad displays
- [ ] Test rewarded ads
- [ ] Verify ad-free for subscribers

### Milestone 4: Feature Complete
- [ ] Complete all remaining tasks
- [ ] Test thoroughly
- [ ] Fix all bugs
- [ ] Prepare for app store

## 📞 Getting Help

If you encounter issues:
1. Check documentation files (SETUP_INSTRUCTIONS.md, PROJECT_STATUS.md)
2. Review error messages carefully
3. Check `.env` configuration
4. Verify package installations
5. Contact support: info@programmerscourt.com

## ⚠️ Important Notes

- **Never commit .env to git** - It contains sensitive credentials
- **Use test credentials first** - Switch to production before release
- **Build for real devices** - Many features don't work in Expo Go
- **Test payments carefully** - Use test mode to avoid charges
- **Review store guidelines** - Before submitting to app stores

---

**Ready to start?** Follow the steps above and check `SETUP_INSTRUCTIONS.md` for detailed guidance!

Good luck with your PlantsGenius app! 🌱
