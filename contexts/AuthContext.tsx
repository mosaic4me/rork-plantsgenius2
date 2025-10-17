import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { signInWithGoogle, signInWithApple, type OAuthUser } from '@/utils/oauthHelpers';

const getApiBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const origin = window.location.origin;
    console.log('[API] Using local API at:', origin);
    return origin;
  }
  
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) {
    console.log('[API] Using env API URL:', envUrl);
    return envUrl.replace(/\/$/, '');
  }
  
  console.log('[API] Defaulting to production API');
  return 'https://api.plantsgenius.site';
};

const API_BASE_URL = getApiBaseUrl();

const TOKEN_EXPIRY_DAYS = 30;

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Subscription {
  id: string;
  plan_type: 'basic' | 'premium';
  status: 'active' | 'cancelled' | 'expired';
  start_date: string;
  end_date: string;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  authProvider?: 'email' | 'google' | 'apple';
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyScansRemaining, setDailyScansRemaining] = useState(2);
  const [isGuest, setIsGuest] = useState(false);
  const [lastResetDate, setLastResetDate] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<'email' | 'google' | 'apple' | null>(null);
  const [adClicksToday, setAdClicksToday] = useState(0);

  const getAuthToken = useCallback(async () => {
    let token: string | null = null;
    let tokenExpiry: string | null = null;
    
    if (Platform.OS === 'web') {
      token = await AsyncStorage.getItem('authToken');
      tokenExpiry = await AsyncStorage.getItem('tokenExpiry');
    } else {
      token = await SecureStore.getItemAsync('authToken');
      tokenExpiry = await SecureStore.getItemAsync('tokenExpiry');
    }
    
    if (token && tokenExpiry) {
      const expiryDate = new Date(tokenExpiry);
      if (new Date() < expiryDate) {
        return token;
      }
      if (Platform.OS === 'web') {
        await AsyncStorage.multiRemove(['authToken', 'tokenExpiry']);
      } else {
        await Promise.all([
          SecureStore.deleteItemAsync('authToken'),
          SecureStore.deleteItemAsync('tokenExpiry')
        ]);
      }
    }
    return null;
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/user/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        let userData;
        try {
          const contentTypeCheck = response.headers.get('content-type');
          if (!contentTypeCheck || !contentTypeCheck.includes('application/json')) {
            console.error('[Auth] Load profile returned non-JSON response');
            return;
          }
          userData = await response.json();
        } catch (parseError) {
          console.error('[Auth] Error parsing profile response:', parseError);
          return;
        }
        const profileData: Profile = {
          id: userData.id,
          email: userData.email,
          full_name: userData.fullName || userData.full_name,
          avatar_url: userData.avatar_url || null,
        };
        setProfile(profileData);
      }
    } catch (error) {
      console.error('[Auth] Error loading profile:', error);
    }
  }, [getAuthToken]);

  const loadSubscription = useCallback(async (userId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/subscription/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        let sub;
        try {
          const contentTypeCheck = response.headers.get('content-type');
          if (!contentTypeCheck || !contentTypeCheck.includes('application/json')) {
            console.error('[Auth] Load subscription returned non-JSON response');
            return;
          }
          sub = await response.json();
        } catch (parseError) {
          console.error('[Auth] Error parsing subscription response:', parseError);
          return;
        }
        if (sub) {
          const subData: Subscription = {
            id: sub.id,
            plan_type: sub.plan_type || sub.planType,
            status: sub.status,
            start_date: sub.start_date || sub.startDate,
            end_date: sub.end_date || sub.endDate,
          };
          setSubscription(subData);
        }
      }
    } catch (error) {
      console.error('[Auth] Error loading subscription:', error);
    }
  }, [getAuthToken]);

  const loadDailyScans = useCallback(async (userId?: string) => {
    try {
      const today = new Date().toLocaleDateString('en-CA');
      
      if (userId) {
        const token = await getAuthToken();
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/scans/${userId}?date=${today}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          let result;
          try {
            const contentTypeCheck = response.headers.get('content-type');
            if (!contentTypeCheck || !contentTypeCheck.includes('application/json')) {
              console.error('[Auth] Load daily scans returned non-JSON response');
              return;
            }
            result = await response.json();
          } catch (parseError) {
            console.error('[Auth] Error parsing daily scans response:', parseError);
            return;
          }
          setDailyScansRemaining(result.scansRemaining || result.scans_remaining || 2);
        }
      } else {
        const storedDate = await AsyncStorage.getItem('lastScanResetDate');
        const storedCount = await AsyncStorage.getItem('dailyScanCount');
        
        if (storedDate !== today) {
          await AsyncStorage.multiSet([
            ['lastScanResetDate', today],
            ['dailyScanCount', '0']
          ]);
          setDailyScansRemaining(2);
          setLastResetDate(today);
        } else {
          const scanCount = parseInt(storedCount || '0', 10);
          setDailyScansRemaining(Math.max(0, 2 - scanCount));
          setLastResetDate(storedDate);
        }
      }
    } catch (error) {
      console.error('[Auth] Error loading daily scans:', error);
    }
  }, [getAuthToken]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await getAuthToken();
        
        const guestMode = await AsyncStorage.getItem('guestMode');
        if (guestMode === 'true' && !token) {
          setIsGuest(true);
          await loadDailyScans();
          setLoading(false);
          return;
        }

        if (token) {
          const storedUser = await AsyncStorage.getItem('currentUser');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            loadProfile(userData.id);
            loadSubscription(userData.id);
            loadDailyScans(userData.id);
          }
        } else {
          await loadDailyScans();
        }
      } catch (error) {
        console.error('[Auth] Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    const checkDailyReset = async () => {
      const today = new Date().toLocaleDateString('en-CA');
      if (lastResetDate && lastResetDate !== today) {
        if (user) {
          await loadDailyScans(user.id);
        } else {
          await loadDailyScans();
        }
      }
    };

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        checkDailyReset();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [lastResetDate, user]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedFullName = fullName.trim();
      
      console.log('[SignUp] Attempting sign up for:', trimmedEmail);
      console.log('[SignUp] API Base URL:', API_BASE_URL);
      
      const signupUrl = `${API_BASE_URL}/api/auth/signup`;
      console.log('[SignUp] Full signup URL:', signupUrl);
      console.log('[SignUp] Window location:', Platform.OS === 'web' ? (typeof window !== 'undefined' ? window.location.href : 'N/A') : 'Not web');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[SignUp] Request timeout - aborting');
        controller.abort();
      }, 30000);
      
      let response;
      try {
        console.log('[SignUp] Sending fetch request...');
        response = await fetch(signupUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            email: trimmedEmail,
            password,
            fullName: trimmedFullName,
          }),
        });
        console.log('[SignUp] Fetch completed');
      } catch (fetchError: any) {
        console.error('[SignUp] Fetch failed:', fetchError);
        console.error('[SignUp] Fetch error name:', fetchError?.name);
        console.error('[SignUp] Fetch error message:', fetchError?.message);
        throw fetchError;
      }
      
      clearTimeout(timeoutId);
      
      console.log('[SignUp] Response status:', response.status);
      console.log('[SignUp] Response ok:', response.ok);
      
      const headersObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });
      console.log('[SignUp] Response headers:', headersObj);
      
      if (response.status === 404) {
        console.log('[SignUp] 404 Error - Backend endpoint not found');
        console.log('[SignUp] Attempted URL:', signupUrl);
        const responseText = await response.text();
        console.log('[SignUp] Response body:', responseText.substring(0, 500));
        throw new Error('BACKEND_UNAVAILABLE: The backend service at ' + API_BASE_URL + ' is not responding. Please contact support.');
      }
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        console.log('[SignUp] Error response content-type:', contentType);
        
        try {
          if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            console.log('[SignUp] Error data:', errorData);
            throw new Error(errorData.error || errorData.message || 'Failed to sign up');
          } else {
            const errorText = await response.text();
            console.log('[SignUp] Error text (first 500 chars):', errorText.substring(0, 500));
            throw new Error(`Server error (${response.status}): ${errorText.substring(0, 200) || 'Unknown error'}`);
          }
        } catch (parseError) {
          console.log('[SignUp] Failed to parse error response:', parseError);
          throw new Error(`Server returned status ${response.status}. Please try again.`);
        }
      }
      
      let result;
      try {
        result = await response.json();
        console.log('[SignUp] Success response:', result);
      } catch (parseError) {
        console.error('[SignUp] Failed to parse success response:', parseError);
        throw new Error('Server returned invalid response format');
      }
      
      if (!result.user && !result.id) {
        console.error('[SignUp] Response missing user data:', result);
        throw new Error('Server returned incomplete data');
      }
      
      if (!result.token && !result.access_token) {
        console.error('[SignUp] Response missing token:', result);
        throw new Error('Server returned incomplete authentication data');
      }
      
      console.log('[SignUp] Success - user created:', result.user?.id || result.id);
      
      const userData: User = {
        id: result.user?.id || result.id,
        email: result.user?.email || result.email,
        fullName: result.user?.fullName || result.fullName || result.user?.full_name || result.full_name,
      };
      
      const token = result.token || result.access_token;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + TOKEN_EXPIRY_DAYS);
      
      if (Platform.OS === 'web') {
        await AsyncStorage.multiSet([
          ['authToken', token],
          ['tokenExpiry', expiryDate.toISOString()],
          ['currentUser', JSON.stringify(userData)]
        ]);
        await AsyncStorage.removeItem('guestMode');
      } else {
        await Promise.all([
          SecureStore.setItemAsync('authToken', token),
          SecureStore.setItemAsync('tokenExpiry', expiryDate.toISOString()),
          AsyncStorage.setItem('currentUser', JSON.stringify(userData)),
          AsyncStorage.removeItem('guestMode')
        ]);
      }
      
      setUser(userData);
      setIsGuest(false);
      
      return { data: userData, error: null };
    } catch (error: any) {
      console.error('[SignUp] Error:', error);
      console.error('[SignUp] Error message:', error?.message);
      console.error('[SignUp] Error name:', error?.name);
      console.error('[SignUp] Error stack:', error?.stack);
      
      let errorMessage = 'Unable to create account at this time.';
      
      if (error?.message) {
        const msg = error.message;
        
        if (error.name === 'AbortError') {
          errorMessage = 'Connection timeout. The server is taking too long to respond. Please try again or use Guest Mode.';
        } else if (msg.includes('BACKEND_UNAVAILABLE')) {
          errorMessage = 'Backend service is not available. Please use Guest Mode or contact support.';
        } else if (msg.includes('Failed to fetch') || msg.includes('Network request failed') || msg.includes('NetworkError')) {
          errorMessage = `Cannot connect to authentication server at ${API_BASE_URL}. This might be due to:\n\n1. Server is temporarily down\n2. Network connectivity issues\n3. CORS/SSL certificate issues\n\nPlease try:\n• Check your internet connection\n• Use Guest Mode to continue\n• Contact support if the issue persists`;
        } else if (msg.toLowerCase().includes('already exists')) {
          errorMessage = 'This email is already registered. Please sign in or use a different email.';
        } else if (msg.toLowerCase().includes('invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (msg.toLowerCase().includes('password must be')) {
          errorMessage = error.message;
        } else if (msg.toLowerCase().includes('mongodb') || msg.toLowerCase().includes('database')) {
          errorMessage = 'Database service is unavailable. Please try again later.';
        } else {
          errorMessage = msg;
        }
      }
      
      return { data: null, error: { message: errorMessage } };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      
      console.log('[SignIn] Attempting sign in for:', trimmedEmail);
      console.log('[SignIn] API Base URL:', API_BASE_URL);
      
      const signinUrl = `${API_BASE_URL}/api/auth/signin`;
      console.log('[SignIn] Full signin URL:', signinUrl);
      console.log('[SignIn] Window location:', Platform.OS === 'web' ? (typeof window !== 'undefined' ? window.location.href : 'N/A') : 'Not web');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[SignIn] Request timeout - aborting');
        controller.abort();
      }, 30000);
      
      let response;
      try {
        console.log('[SignIn] Sending fetch request...');
        response = await fetch(signinUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            email: trimmedEmail,
            password,
          }),
        });
        console.log('[SignIn] Fetch completed');
      } catch (fetchError: any) {
        console.error('[SignIn] Fetch failed:', fetchError);
        console.error('[SignIn] Fetch error name:', fetchError?.name);
        console.error('[SignIn] Fetch error message:', fetchError?.message);
        throw fetchError;
      }
      
      clearTimeout(timeoutId);
      
      console.log('[SignIn] Response status:', response.status);
      console.log('[SignIn] Response ok:', response.ok);
      
      const headersObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });
      console.log('[SignIn] Response headers:', headersObj);
      
      if (response.status === 404) {
        console.log('[SignIn] 404 Error - Backend endpoint not found');
        console.log('[SignIn] Attempted URL:', signinUrl);
        const responseText = await response.text();
        console.log('[SignIn] Response body:', responseText.substring(0, 500));
        throw new Error('BACKEND_UNAVAILABLE: The backend service at ' + API_BASE_URL + ' is not responding. Please contact support.');
      }
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        console.log('[SignIn] Error response content-type:', contentType);
        
        let errorText = '';
        let errorData: any = null;
        
        try {
          if (contentType?.includes('application/json')) {
            errorData = await response.json();
            console.log('[SignIn] Error data:', errorData);
            throw new Error(errorData.error || errorData.message || 'Failed to sign in');
          } else {
            errorText = await response.text();
            console.log('[SignIn] Error text (first 500 chars):', errorText.substring(0, 500));
            
            if (errorText.toLowerCase().includes('too many requests') || errorText.toLowerCase().includes('rate limit')) {
              throw new Error('You have made too many requests. Please wait a few minutes and try again.');
            }
            
            if (errorText.toLowerCase().includes('invalid email or password') || errorText.toLowerCase().includes('invalid credentials')) {
              throw new Error('Invalid email or password');
            }
            
            if (errorText.toLowerCase().includes('user not found')) {
              throw new Error('No account found with this email. Please sign up first.');
            }
            
            if (errorText) {
              throw new Error(`Authentication failed: ${errorText.substring(0, 150)}`);
            }
            
            throw new Error(`Authentication failed with status ${response.status}. Please try again.`);
          }
        } catch (parseError) {
          if (parseError instanceof Error && (
            parseError.message.toLowerCase().includes('too many requests') || 
            parseError.message.includes('Invalid email or password') || 
            parseError.message.includes('Authentication failed') ||
            parseError.message.includes('No account found')
          )) {
            throw parseError;
          }
          console.log('[SignIn] Failed to parse error response:', parseError);
          throw new Error(`Authentication failed with status ${response.status}. Please try again.`);
        }
      }
      
      let result;
      try {
        const contentTypeCheck = response.headers.get('content-type');
        if (!contentTypeCheck || !contentTypeCheck.includes('application/json')) {
          const textResponse = await response.text();
          console.log('[SignIn] Non-JSON success response:', textResponse.substring(0, 200));
          throw new Error('Server returned invalid response format');
        }
        result = await response.json();
        console.log('[SignIn] Success - user authenticated:', result.user?.id || result.id);
      } catch (parseError) {
        console.error('[SignIn] Failed to parse success response:', parseError);
        throw new Error('Server returned invalid response format');
      }
      
      const userData: User = {
        id: result.user?.id || result.id,
        email: result.user?.email || result.email,
        fullName: result.user?.fullName || result.fullName || result.user?.full_name || result.full_name,
      };
      
      const token = result.token || result.access_token;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + TOKEN_EXPIRY_DAYS);
      
      if (Platform.OS === 'web') {
        await AsyncStorage.multiSet([
          ['authToken', token],
          ['tokenExpiry', expiryDate.toISOString()],
          ['currentUser', JSON.stringify(userData)]
        ]);
        await AsyncStorage.removeItem('guestMode');
      } else {
        await Promise.all([
          SecureStore.setItemAsync('authToken', token),
          SecureStore.setItemAsync('tokenExpiry', expiryDate.toISOString()),
          AsyncStorage.setItem('currentUser', JSON.stringify(userData)),
          AsyncStorage.removeItem('guestMode')
        ]);
      }
      
      setUser(userData);
      setIsGuest(false);
      
      return { data: userData, error: null };
    } catch (error: any) {
      console.error('[SignIn] Error:', error);
      console.error('[SignIn] Error message:', error?.message);
      console.error('[SignIn] Error name:', error?.name);
      console.error('[SignIn] Error stack:', error?.stack);
      
      let errorMessage = 'Unable to sign in at this time.';
      
      if (error?.message) {
        const msg = error.message;
        
        if (error.name === 'AbortError') {
          errorMessage = 'Connection timeout. The server is taking too long to respond. Please try again or use Guest Mode.';
        } else if (msg.includes('BACKEND_UNAVAILABLE')) {
          errorMessage = 'Backend service is not available. Please use Guest Mode or contact support.';
        } else if (msg.includes('Failed to fetch') || msg.includes('Network request failed') || msg.includes('NetworkError')) {
          errorMessage = `Cannot connect to authentication server at ${API_BASE_URL}. This might be due to:\n\n1. Server is temporarily down\n2. Network connectivity issues\n3. CORS/SSL certificate issues\n\nPlease try:\n• Check your internet connection\n• Use Guest Mode to continue\n• Contact support if the issue persists`;
        } else if (msg.toLowerCase().includes('invalid credentials') || msg.toLowerCase().includes('invalid email or password')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (msg.toLowerCase().includes('user not found')) {
          errorMessage = 'No account found with this email. Please sign up first.';
        } else if (msg.toLowerCase().includes('mongodb') || msg.toLowerCase().includes('database')) {
          errorMessage = 'Database service is unavailable. Please try again later.';
        } else if (msg.includes('Server returned status')) {
          errorMessage = msg;
        } else {
          errorMessage = msg;
        }
      }
      
      return { data: null, error: { message: errorMessage } };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.multiRemove(['currentUser', 'guestMode', 'authProvider', 'authToken', 'tokenExpiry']);
      } else {
        await Promise.all([
          AsyncStorage.multiRemove(['currentUser', 'guestMode', 'authProvider']),
          SecureStore.deleteItemAsync('authToken').catch(() => {}),
          SecureStore.deleteItemAsync('tokenExpiry').catch(() => {})
        ]);
      }
      setUser(null);
      setProfile(null);
      setSubscription(null);
      setIsGuest(false);
      setAuthProvider(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return { error: 'No user logged in' };

    try {
      const token = await getAuthToken();
      if (!token) return { error: 'Not authenticated' };

      const response = await fetch(`${API_BASE_URL}/api/user/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: updates.full_name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      await loadProfile(user.id);
      return { error: null };
    } catch (error: any) {
      console.error('[Auth] Error updating profile:', error);
      return { error };
    }
  }, [user, loadProfile, getAuthToken]);

  const resetPassword = useCallback(async (_email: string) => {
    return { error: null };
  }, []);

  const incrementDailyScan = useCallback(async () => {
    try {
      const today = new Date().toLocaleDateString('en-CA');
      
      if (user) {
        const token = await getAuthToken();
        if (token) {
          await fetch(`${API_BASE_URL}/api/scans/${user.id}/increment`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ date: today }),
          });
          await loadDailyScans(user.id);
        }
      } else {
        const storedCount = await AsyncStorage.getItem('dailyScanCount');
        const newCount = parseInt(storedCount || '0', 10) + 1;
        await AsyncStorage.setItem('dailyScanCount', newCount.toString());
        setDailyScansRemaining(Math.max(0, 2 - newCount));
      }
    } catch (error) {
      console.error('[Auth] Error incrementing daily scan:', error);
    }
  }, [user, loadDailyScans, getAuthToken]);

  const addEarnedScan = useCallback(async () => {
    try {
      const today = new Date().toLocaleDateString('en-CA');
      
      const storedDate = await AsyncStorage.getItem('lastAdClickDate');
      const storedClicks = await AsyncStorage.getItem('adClicksToday');
      
      if (storedDate !== today) {
        await AsyncStorage.multiSet([
          ['lastAdClickDate', today],
          ['adClicksToday', '1']
        ]);
        setAdClicksToday(1);
      } else {
        const clicks = parseInt(storedClicks || '0', 10);
        if (clicks < 2) {
          const newClicks = clicks + 1;
          await AsyncStorage.setItem('adClicksToday', newClicks.toString());
          setAdClicksToday(newClicks);
        }
      }
      
      setDailyScansRemaining(prev => prev + 1);
    } catch (error) {
      console.error('Error adding earned scan:', error);
    }
  }, []);

  const canEarnMoreScans = useCallback(async () => {
    try {
      const today = new Date().toLocaleDateString('en-CA');
      const storedDate = await AsyncStorage.getItem('lastAdClickDate');
      const storedClicks = await AsyncStorage.getItem('adClicksToday');
      
      if (storedDate !== today) {
        return true;
      }
      
      const clicks = parseInt(storedClicks || '0', 10);
      return clicks < 2;
    } catch (error) {
      console.error('Error checking earned scans:', error);
      return false;
    }
  }, []);

  const hasActiveSubscription = useCallback(() => {
    return subscription?.status === 'active';
  }, [subscription]);

  const canScan = useCallback(() => {
    return hasActiveSubscription() || dailyScansRemaining > 0;
  }, [hasActiveSubscription, dailyScansRemaining]);

  const deleteAccount = useCallback(async () => {
    if (!user) return { error: 'No user logged in' };

    try {
      const token = await getAuthToken();
      if (!token) return { error: 'Not authenticated' };

      console.log('[Auth] Attempting to delete account for user:', user.id);
      
      const deleteUrl = `${API_BASE_URL}/api/trpc/auth.deleteUser?batch=1`;
      console.log('[Auth] Delete URL:', deleteUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[Auth] Delete request timeout - aborting');
        controller.abort();
      }, 15000);
      
      const response = await fetch(deleteUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          "0": {
            userId: user.id
          }
        }),
      });
      
      clearTimeout(timeoutId);

      console.log('[Auth] Delete response status:', response.status);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (response.status === 429) {
          throw new Error('You have made too many requests. Please wait a few minutes and try again.');
        }
        
        try {
          if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            const errorMessage = errorData.error || errorData.message || 'Failed to delete account';
            
            if (errorMessage.toLowerCase().includes('too many requests') || errorMessage.toLowerCase().includes('rate limit')) {
              throw new Error('You have made too many requests. Please wait a few minutes and try again.');
            }
            
            throw new Error(errorMessage);
          } else {
            const errorText = await response.text();
            
            if (errorText.toLowerCase().includes('too many requests') || errorText.toLowerCase().includes('rate limit')) {
              throw new Error('You have made too many requests. Please wait a few minutes and try again.');
            }
            
            throw new Error(errorText || 'Failed to delete account');
          }
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message.toLowerCase().includes('too many requests')) {
            throw parseError;
          }
          throw new Error(`Server returned status ${response.status}. Please try again.`);
        }
      }

      let result;
      try {
        const contentTypeCheck = response.headers.get('content-type');
        if (!contentTypeCheck || !contentTypeCheck.includes('application/json')) {
          const textResponse = await response.text();
          console.log('[Auth] Non-JSON delete response:', textResponse.substring(0, 200));
          throw new Error('Server returned invalid response format');
        }
        result = await response.json();
        console.log('[Auth] Delete successful:', result);
      } catch (parseError) {
        console.error('[Auth] Failed to parse delete response:', parseError);
        throw new Error('Server returned invalid response format');
      }

      if (Platform.OS === 'web') {
        await AsyncStorage.multiRemove(['currentUser', 'authToken', 'tokenExpiry', 'authProvider', 'guestMode']);
      } else {
        await Promise.all([
          AsyncStorage.multiRemove(['currentUser', 'authProvider', 'guestMode']),
          SecureStore.deleteItemAsync('authToken').catch(() => {}),
          SecureStore.deleteItemAsync('tokenExpiry').catch(() => {})
        ]);
      }
      
      setUser(null);
      setProfile(null);
      setSubscription(null);
      setAuthProvider(null);
      setIsGuest(false);
      
      return { error: null };
    } catch (error: any) {
      let errorMessage = 'Unable to delete account at this time.';
      
      if (error?.message) {
        const msg = error.message;
        
        if (error.name === 'AbortError') {
          errorMessage = 'Request timeout. Please check your internet connection and try again.';
        } else if (msg.toLowerCase().includes('too many requests') || msg.toLowerCase().includes('rate limit')) {
          errorMessage = 'You have made too many requests. Please wait a few minutes and try again.';
        } else if (msg.includes('Failed to fetch') || msg.includes('Network request failed')) {
          errorMessage = 'Cannot connect to server. Please check your internet connection and try again.';
        } else if (msg.toLowerCase().includes('backend_unavailable')) {
          errorMessage = 'Service is temporarily unavailable. Please try again later.';
        } else if (msg.toLowerCase().includes('not authenticated') || msg.toLowerCase().includes('unauthorized')) {
          errorMessage = 'Your session has expired. Please sign in again.';
        } else {
          errorMessage = msg;
        }
      }
      
      console.log('[Auth] Delete account error:', errorMessage);
      
      return { error: errorMessage };
    }
  }, [user, getAuthToken]);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'apple') => {
    try {
      console.log(`[OAuth] Starting ${provider} sign in`);
      
      let oauthUser: OAuthUser | null = null;
      
      if (provider === 'google') {
        oauthUser = await signInWithGoogle();
      } else if (provider === 'apple') {
        oauthUser = await signInWithApple();
      }
      
      if (!oauthUser) {
        return { data: null, error: null };
      }
      
      console.log(`[OAuth] ${provider} sign in successful, creating/fetching user`);
      
      try {
        const signinUrl = `${API_BASE_URL}/api/auth/signin`;
        const signInResponse = await fetch(signinUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            email: oauthUser.email,
            password: oauthUser.id,
          }),
        });
        
        if (signInResponse.ok) {
          let result;
          try {
            const contentTypeCheck = signInResponse.headers.get('content-type');
            if (!contentTypeCheck || !contentTypeCheck.includes('application/json')) {
              const textResponse = await signInResponse.text();
              console.log('[OAuth] Non-JSON response:', textResponse.substring(0, 200));
              throw new Error('Server returned invalid response format');
            }
            result = await signInResponse.json();
          } catch (parseError) {
            console.error('[OAuth] Failed to parse signin response:', parseError);
            throw new Error('Server returned invalid response format');
          }
          
          const userData: User = {
            id: result.user?.id || result.id,
            email: result.user?.email || result.email,
            fullName: result.user?.fullName || result.fullName || result.user?.full_name || result.full_name,
            authProvider: provider,
          };
          
          const token = result.token || result.access_token;
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + TOKEN_EXPIRY_DAYS);
          
          if (Platform.OS === 'web') {
            await AsyncStorage.multiSet([
              ['authToken', token],
              ['tokenExpiry', expiryDate.toISOString()],
              ['currentUser', JSON.stringify(userData)],
              ['authProvider', provider]
            ]);
            await AsyncStorage.removeItem('guestMode');
          } else {
            await Promise.all([
              SecureStore.setItemAsync('authToken', token),
              SecureStore.setItemAsync('tokenExpiry', expiryDate.toISOString()),
              AsyncStorage.multiSet([
                ['currentUser', JSON.stringify(userData)],
                ['authProvider', provider]
              ]),
              AsyncStorage.removeItem('guestMode')
            ]);
          }
          
          setUser(userData);
          setAuthProvider(provider);
          setIsGuest(false);
          
          return { data: userData, error: null };
        }
        
        let signInError;
        try {
          const contentTypeCheck = signInResponse.headers.get('content-type');
          if (contentTypeCheck && contentTypeCheck.includes('application/json')) {
            signInError = await signInResponse.json();
          } else {
            const errorText = await signInResponse.text();
            signInError = { error: errorText };
          }
        } catch (parseError) {
          console.error('[OAuth] Failed to parse error response:', parseError);
          signInError = { error: 'Authentication failed' };
        }
        if (signInError.error?.includes('Invalid') || signInError.error?.includes('not found')) {
          console.log(`[OAuth] User not found, creating new account`);
          
          const signupUrl = `${API_BASE_URL}/api/auth/signup`;
          const signUpResponse = await fetch(signupUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              email: oauthUser.email,
              password: oauthUser.id,
              fullName: oauthUser.fullName,
            }),
          });
          
          if (!signUpResponse.ok) {
            let errorData;
            try {
              const contentTypeCheck = signUpResponse.headers.get('content-type');
              if (contentTypeCheck && contentTypeCheck.includes('application/json')) {
                errorData = await signUpResponse.json();
              } else {
                const errorText = await signUpResponse.text();
                errorData = { error: errorText };
              }
            } catch (parseError) {
              errorData = { error: 'Failed to create account' };
            }
            throw new Error(errorData.error || 'Failed to create account');
          }
          
          let createResult;
          try {
            const contentTypeCheck = signUpResponse.headers.get('content-type');
            if (!contentTypeCheck || !contentTypeCheck.includes('application/json')) {
              const textResponse = await signUpResponse.text();
              console.log('[OAuth] Non-JSON signup response:', textResponse.substring(0, 200));
              throw new Error('Server returned invalid response format');
            }
            createResult = await signUpResponse.json();
          } catch (parseError) {
            console.error('[OAuth] Failed to parse signup response:', parseError);
            throw new Error('Server returned invalid response format');
          }
          
          const userData: User = {
            id: createResult.user?.id || createResult.id,
            email: createResult.user?.email || createResult.email,
            fullName: createResult.user?.fullName || createResult.fullName || createResult.user?.full_name || createResult.full_name,
            authProvider: provider,
          };
          
          const token = createResult.token || createResult.access_token;
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + TOKEN_EXPIRY_DAYS);
          
          if (Platform.OS === 'web') {
            await AsyncStorage.multiSet([
              ['authToken', token],
              ['tokenExpiry', expiryDate.toISOString()],
              ['currentUser', JSON.stringify(userData)],
              ['authProvider', provider]
            ]);
            await AsyncStorage.removeItem('guestMode');
          } else {
            await Promise.all([
              SecureStore.setItemAsync('authToken', token),
              SecureStore.setItemAsync('tokenExpiry', expiryDate.toISOString()),
              AsyncStorage.multiSet([
                ['currentUser', JSON.stringify(userData)],
                ['authProvider', provider]
              ]),
              AsyncStorage.removeItem('guestMode')
            ]);
          }
          
          setUser(userData);
          setAuthProvider(provider);
          setIsGuest(false);
          
          return { data: userData, error: null };
        }
        
        throw new Error(signInError.error || 'Failed to authenticate');
      } catch (oauthError: any) {
        throw oauthError;
      }
    } catch (error: any) {
      console.error(`[OAuth] ${provider} sign in error:`, error);
      console.error('[OAuth] Error message:', error?.message);
      console.error('[OAuth] Error name:', error?.name);
      
      let errorMessage = `Failed to sign in with ${provider}. Please try again.`;
      
      if (error?.message) {
        const msg = error.message;
        
        if (msg.includes('BACKEND_UNAVAILABLE')) {
          errorMessage = `Backend service is not available. Please use Guest Mode or contact support.`;
        } else if (msg.includes('Failed to fetch') || msg.includes('Network request failed')) {
          errorMessage = `Cannot connect to server. Please check your internet connection and try again.`;
        } else if (msg.toLowerCase().includes('user cancelled') || msg.toLowerCase().includes('cancelled')) {
          return { data: null, error: null };
        } else {
          errorMessage = msg;
        }
      }
      
      return { 
        data: null, 
        error: { message: errorMessage } 
      };
    }
  }, []);

  const continueAsGuest = useCallback(async () => {
    try {
      await AsyncStorage.setItem('guestMode', 'true');
      setIsGuest(true);
      return { error: null };
    } catch (error: any) {
      console.error('Error setting guest mode:', error);
      return { error };
    }
  }, []);

  return useMemo(() => ({
    user,
    profile,
    subscription,
    loading,
    dailyScansRemaining,
    isGuest,
    authProvider,
    adClicksToday,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
    resetPassword,
    incrementDailyScan,
    addEarnedScan,
    canEarnMoreScans,
    hasActiveSubscription,
    canScan,
    continueAsGuest,
    deleteAccount,
  }), [
    user,
    profile,
    subscription,
    loading,
    dailyScansRemaining,
    isGuest,
    authProvider,
    adClicksToday,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
    resetPassword,
    incrementDailyScan,
    addEarnedScan,
    canEarnMoreScans,
    hasActiveSubscription,
    canScan,
    continueAsGuest,
    deleteAccount,
  ]);
});
