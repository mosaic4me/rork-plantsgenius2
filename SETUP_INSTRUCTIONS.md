# PlantsGenius - Setup & Configuration Guide

## ✅ Completed Implementations

### 1. Environment Variables Setup
- Created `.env` file with all configuration
- Removed hardcoded credentials from codebase
- Configured production API endpoint: `https://api.plantsgenius.site/api`
- Updated lib/trpc.ts, lib/supabase.ts, and utils/plantIdApi.ts to use environment variables

### 2. Dashboard Updates
- Updated "Community" text to include "(Coming Soon)"
- All dashboard UI improvements completed

### 3. Settings Page
- Removed blank "Upgrade to Premium" button under Scan Usage section
- Cleaned up UI for better UX

### 4. Security Enhancements
- All API keys and credentials moved to .env
- Production-ready security configuration

## 🔧 Configuration Required

### Step 1: Configure OAuth Credentials

Edit `.env` and add your OAuth credentials:

```env
# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-actual-google-web-client-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-actual-google-android-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-actual-google-ios-client-id

# Apple Sign In
EXPO_PUBLIC_APPLE_CLIENT_ID=your-actual-apple-client-id
```

### Step 2: Configure Payment Providers

```env
# Google Pay & Apple Pay
EXPO_PUBLIC_GOOGLE_PAY_MERCHANT_ID=your-merchant-id
EXPO_PUBLIC_APPLE_PAY_MERCHANT_ID=your-merchant-id

# Paystack (Already configured with test key)
EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_actual_paystack_key
```

### Step 3: Configure Google AdMob

```env
EXPO_PUBLIC_ADMOB_ENABLED=true  # Set to true when ready
EXPO_PUBLIC_ADMOB_APP_ID_ANDROID=ca-app-pub-xxxxx~xxxxx
EXPO_PUBLIC_ADMOB_APP_ID_IOS=ca-app-pub-xxxxx~xxxxx
EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID=ca-app-pub-xxxxx/xxxxx
EXPO_PUBLIC_ADMOB_BANNER_ID_IOS=ca-app-pub-xxxxx/xxxxx
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID=ca-app-pub-xxxxx/xxxxx
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS=ca-app-pub-xxxxx/xxxxx
EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID=ca-app-pub-xxxxx/xxxxx
EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS=ca-app-pub-xxxxx/xxxxx
```

## 📦 Required Package Installations

### OAuth Packages
```bash
bun add @react-native-google-signin/google-signin
bun add expo-apple-authentication
bun add expo-auth-session
```

### Payment Packages
```bash
# Google Pay for Android
bun add react-native-google-pay

# Apple Pay (built into React Native)
# No additional package needed
```

### Ad Integration
```bash
bun add react-native-google-mobile-ads
```

## 🚀 Implementation Tasks Remaining

### Priority 1: Authentication Enhancements

#### Google OAuth (app/auth.tsx)
```typescript
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In
useEffect(() => {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: true,
  });
}, []);

// Add button in auth screen
<TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
  <Image source={require('./assets/google-logo.png')} style={styles.googleIcon} />
  <Text style={styles.googleButtonText}>Continue with Google</Text>
</TouchableOpacity>
```

#### Apple Sign In (app/auth.tsx - iOS only)
```typescript
import * as AppleAuthentication from 'expo-apple-authentication';

{Platform.OS === 'ios' && (
  <AppleAuthentication.AppleAuthenticationButton
    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
    cornerRadius={12}
    style={styles.appleButton}
    onPress={handleAppleSignIn}
  />
)}
```

### Priority 2: Payment Integration

#### Create utils/payments/currency.ts
```typescript
import * as Location from 'expo-location';

export async function getCurrencyForLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return 'USD';
  
  const location = await Location.getCurrentPositionAsync({});
  const geocode = await Location.reverseGeocodeAsync({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  });
  
  // Map country to currency
  const currencyMap = {
    NG: 'NGN', // Nigeria
    GH: 'GHS', // Ghana
    // Add more countries
  };
  
  return currencyMap[geocode[0]?.isoCountryCode] || 'USD';
}

export async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string) {
  const apiKey = process.env.EXPO_PUBLIC_CURRENCY_API_KEY;
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_CURRENCY_API_URL}?apikey=${apiKey}&base_currency=${fromCurrency}`
  );
  const data = await response.json();
  const rate = data.data[toCurrency];
  
  // Round to nearest 100
  const converted = amount * rate;
  return Math.round(converted / 100) * 100;
}
```

#### Create utils/payments/googlePay.ts
```typescript
import { Platform } from 'react-native';
import GooglePay from 'react-native-google-pay';

export async function initializeGooglePay() {
  if (Platform.OS !== 'android') return false;
  
  const isReadyToPay = await GooglePay.isReadyToPay();
  return isReadyToPay;
}

export async function processGooglePayPayment(amount: number, currency: string) {
  const paymentRequest = {
    merchantId: process.env.EXPO_PUBLIC_GOOGLE_PAY_MERCHANT_ID,
    total: {
      label: 'PlantsGenius Subscription',
      amount: amount.toString(),
      currency: currency,
    },
  };
  
  const token = await GooglePay.requestPayment(paymentRequest);
  return token;
}
```

#### Create utils/payments/applePay.ts
```typescript
import { Platform } from 'react-native';
import { PaymentRequest } from 'react-native';

export async function processApplePayPayment(amount: number, currency: string) {
  if (Platform.OS !== 'ios') return null;
  
  const paymentRequest = {
    id: 'plantgenius-subscription',
    displayItems: [
      {
        label: 'PlantsGenius Subscription',
        amount: { currency, value: amount.toString() },
      },
    ],
    total: {
      label: 'Total',
      amount: { currency, value: amount.toString() },
    },
    merchantIdentifier: process.env.EXPO_PUBLIC_APPLE_PAY_MERCHANT_ID,
  };
  
  // Process payment
  // Return payment token
}
```

### Priority 3: Billing Page (app/billing.tsx)

Create a comprehensive billing page with:
- Current plan display
- Remaining subscription days
- Payment history
- Upgrade/downgrade options
- Scan usage statistics

### Priority 4: Enhanced Garden Features

Update contexts/AppContext.tsx to add watering history viewing:
```typescript
const getPlantWateringHistory = useCallback((plantId: string) => {
  const plant = garden.find(p => p.id === plantId);
  return plant?.wateringHistory || [];
}, [garden]);
```

Add modal in app/(tabs)/garden.tsx to show history when plant is tapped.

### Priority 5: AdMob Integration

Update components/InterstitialAd.tsx:
```typescript
import { InterstitialAd, RewardedAd, TestIds } from 'react-native-google-mobile-ads';

const adUnitId = __DEV__ 
  ? TestIds.INTERSTITIAL 
  : Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS,
      android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID,
    });

// Show rewarded ad for earning free scans
const rewardedAdUnitId = __DEV__
  ? TestIds.REWARDED
  : Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS,
      android: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID,
    });
```

### Priority 6: Scan Quota Enforcement

Update app/(tabs)/scan.tsx to block camera when quota exhausted:
```typescript
useEffect(() => {
  if (!canScan() && !hasActiveSubscription()) {
    Toast.show({
      type: 'info',
      text1: 'Daily Scan Limit Reached',
      text2: 'Go to Profile to earn a free scan by watching an ad',
      position: 'top',
    });
    router.back();
  }
}, [canScan, hasActiveSubscription]);
```

### Priority 7: Profile Page Enhancements

Add subscription days remaining:
```typescript
const getSubscriptionDaysRemaining = () => {
  if (!subscription || subscription.status !== 'active') return 0;
  const endDate = new Date(subscription.end_date);
  const today = new Date();
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};
```

Add "Earn a Free Scan" button:
```typescript
{!hasActiveSubscription() && dailyScansRemaining === 0 && (
  <TouchableOpacity 
    style={styles.earnScanButton}
    onPress={() => setShowRewardedAd(true)}
  >
    <Text style={styles.earnScanButtonText}>Earn a Free Scan</Text>
    <Text style={styles.earnScanSubtext}>Watch a 60-second ad</Text>
  </TouchableOpacity>
)}
```

### Priority 8: Download Permissions

Add to app/results.tsx (or wherever downloads occur):
```typescript
import * as MediaLibrary from 'expo-media-library';

const handleDownload = async () => {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    Toast.show({
      type: 'error',
      text1: 'Permission Required',
      text2: 'Please grant storage permission to download images',
      position: 'top',
    });
    return;
  }
  
  // Proceed with download
};
```

### Priority 9: Notification Font Size

Create utils/toast.ts:
```typescript
import Toast from 'react-native-toast-message';

export const showToast = (type: string, title: string, message: string) => {
  Toast.show({
    type,
    text1: title,
    text2: message,
    position: 'top',
    text1Style: {
      fontSize: 18 * 1.6,  // 60% increase
      fontWeight: '700',
    },
    text2Style: {
      fontSize: 14 * 1.6,  // 60% increase
    },
  });
};
```

Replace all Toast.show() calls with showToast().

### Priority 10: Splash Screen Redesign

Update app.json splash configuration:
```json
"splash": {
  "image": "./assets/images/splash-screen.png",
  "resizeMode": "cover",
  "backgroundColor": "#2D5016"
}
```

Create custom animated splash component if needed.

## 🧪 Testing Checklist

- [ ] Test Google OAuth on Android
- [ ] Test Google & Apple OAuth on iOS
- [ ] Test payment flow with test cards
- [ ] Verify currency conversion
- [ ] Test ad display and rewards
- [ ] Test scan quota enforcement
- [ ] Test offline functionality
- [ ] Test notification permissions
- [ ] Test download permissions

## 📚 API Documentation

Backend API: https://api.plantsgenius.site/api
Documentation: https://app.gitbook.com/o/bGzRSCDZPZPoZGYDqihw/s/tFVMGP9J0b3cLQVDCOtm/

## 🔐 Security Best Practices

1. **Never commit .env file**
   - Add `.env` to `.gitignore`
   - Use `.env.example` for documentation

2. **Use different credentials for dev/prod**
   - Development: Test API keys
   - Production: Production API keys

3. **Validate all user inputs**
   - Sanitize data before API calls
   - Use TypeScript for type safety

4. **Secure payment processing**
   - Never store credit card details
   - Use tokenization
   - Comply with PCI DSS

## 📞 Support

For issues or questions:
- Email: info@programmerscourt.com
- GitHub Issues: [Your Repository]

## 📝 License

© 2025 Programmers' Court LTD. All rights reserved.
