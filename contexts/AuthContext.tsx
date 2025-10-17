import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpcClient } from '@/lib/trpc';
import { signInWithGoogle, signInWithApple, type OAuthUser } from '@/utils/oauthHelpers';
import { checkBackendHealth } from '@/utils/backendHealthCheck';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.plantsgenius.site';

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
  const [earnedScans, setEarnedScans] = useState(0);
  const [adClicksToday, setAdClicksToday] = useState(0);
  const [lastAdClickDate, setLastAdClickDate] = useState<string | null>(null);

  const [profileCache, setProfileCache] = useState<Map<string, { data: Profile; timestamp: number }>>(new Map());
  const [isLoadingProfile, setIsLoadingProfile] = useState<Set<string>>(new Set());
  const CACHE_DURATION = 60000; // 1 minute
  const MAX_RETRY_DELAY = 30000; // 30 seconds

  const loadProfile = useCallback(async (userId: string, retryCount = 0) => {
    // Check cache first
    const cached = profileCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setProfile(cached.data);
      return;
    }

    // Prevent duplicate requests
    if (isLoadingProfile.has(userId)) {
      return;
    }

    try {
      setIsLoadingProfile(prev => new Set(prev).add(userId));
      await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay
      const user = await trpcClient.auth.getUser.query({ userId });
      if (user) {
        const profileData: Profile = {
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          avatar_url: null,
        };
        setProfile(profileData);
        setProfileCache(prev => new Map(prev).set(userId, { data: profileData, timestamp: Date.now() }));
      }
    } catch (error: any) {
      if (error?.message?.includes('RATE_LIMITED')) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), MAX_RETRY_DELAY);
        console.warn(`[Auth] Rate limited - will retry profile load in ${delay}ms`);
        setTimeout(() => loadProfile(userId, retryCount + 1), delay);
        return;
      }
      console.error('Error loading profile:', error);
    } finally {
      setIsLoadingProfile(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [profileCache, isLoadingProfile]);

  const [subscriptionCache, setSubscriptionCache] = useState<Map<string, { data: Subscription; timestamp: number }>>(new Map());
  const [isLoadingSubscription, setIsLoadingSubscription] = useState<Set<string>>(new Set());

  const loadSubscription = useCallback(async (userId: string, retryCount = 0) => {
    // Check cache first
    const cached = subscriptionCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setSubscription(cached.data);
      return;
    }

    // Prevent duplicate requests
    if (isLoadingSubscription.has(userId)) {
      return;
    }

    try {
      setIsLoadingSubscription(prev => new Set(prev).add(userId));
      await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay
      const sub = await trpcClient.subscription.getSubscription.query({ userId });
      if (sub) {
        const subData: Subscription = {
          id: sub.id,
          plan_type: sub.planType,
          status: sub.status,
          start_date: sub.startDate,
          end_date: sub.endDate,
        };
        setSubscription(subData);
        setSubscriptionCache(prev => new Map(prev).set(userId, { data: subData, timestamp: Date.now() }));
      }
    } catch (error: any) {
      if (error?.message?.includes('RATE_LIMITED')) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), MAX_RETRY_DELAY);
        console.warn(`[Auth] Rate limited - will retry subscription load in ${delay}ms`);
        setTimeout(() => loadSubscription(userId, retryCount + 1), delay);
        return;
      }
      console.error('Error loading subscription:', error);
    } finally {
      setIsLoadingSubscription(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [subscriptionCache, isLoadingSubscription]);

  const [scansCache, setScansCache] = useState<Map<string, { scansRemaining: number; timestamp: number }>>(new Map());
  const [isLoadingScans, setIsLoadingScans] = useState<Set<string>>(new Set());

  const loadDailyScans = useCallback(async (userId?: string, retryCount = 0) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = userId || 'guest';
      
      // Check cache first
      const cached = scansCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setDailyScansRemaining(cached.scansRemaining);
        return;
      }

      // Prevent duplicate requests
      if (isLoadingScans.has(cacheKey)) {
        return;
      }
      
      if (userId) {
        setIsLoadingScans(prev => new Set(prev).add(cacheKey));
        await new Promise(resolve => setTimeout(resolve, 1500)); // Increased delay
        const result = await trpcClient.scans.getDailyScans.query({ userId, date: today });
        setDailyScansRemaining(result.scansRemaining);
        setScansCache(prev => new Map(prev).set(cacheKey, { scansRemaining: result.scansRemaining, timestamp: Date.now() }));
        setIsLoadingScans(prev => {
          const next = new Set(prev);
          next.delete(cacheKey);
          return next;
        });
      } else {
        const storedDate = await AsyncStorage.getItem('lastScanResetDate');
        const storedCount = await AsyncStorage.getItem('dailyScanCount');
        
        if (storedDate !== today) {
          await AsyncStorage.setItem('lastScanResetDate', today);
          await AsyncStorage.setItem('dailyScanCount', '0');
          setDailyScansRemaining(2);
          setLastResetDate(today);
        } else {
          const scanCount = parseInt(storedCount || '0', 10);
          setDailyScansRemaining(Math.max(0, 2 - scanCount));
          setLastResetDate(storedDate);
        }
      }
    } catch (error: any) {
      if (error?.message?.includes('RATE_LIMITED')) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), MAX_RETRY_DELAY);
        console.warn(`[Auth] Rate limited - will retry scans load in ${delay}ms`);
        setTimeout(() => loadDailyScans(userId, retryCount + 1), delay);
        return;
      }
      console.error('Error loading daily scans:', error);
    }
  }, [scansCache, isLoadingScans]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const guestMode = await AsyncStorage.getItem('guestMode');
        if (guestMode === 'true') {
          setIsGuest(true);
          await loadDailyScans();
          setLoading(false);
          return;
        }

        const storedUser = await AsyncStorage.getItem('currentUser');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          // Load data sequentially with delays to prevent rate limiting
          setTimeout(() => loadProfile(userData.id), 500);
          setTimeout(() => loadSubscription(userData.id), 1500);
          setTimeout(() => loadDailyScans(userData.id), 2500);
        } else {
          await loadDailyScans();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const midnightCheckInterval = setInterval(async () => {
      const today = new Date().toISOString().split('T')[0];
      if (lastResetDate && lastResetDate !== today) {
        if (user) {
          await loadDailyScans(user.id);
        } else {
          await loadDailyScans();
        }
      }
    }, 60000);

    return () => {
      clearInterval(midnightCheckInterval);
    };
  }, [loadProfile, loadSubscription, loadDailyScans, lastResetDate, user]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedFullName = fullName.trim();
      
      console.log('[SignUp] Attempting sign up for:', trimmedEmail);
      
      console.log('[SignUp] Checking backend health...');
      const healthCheck = await checkBackendHealth();
      if (!healthCheck.isAvailable) {
        console.error('[SignUp] Backend is not available:', healthCheck.message);
        throw new Error('BACKEND_NOT_AVAILABLE');
      }
      console.log('[SignUp] Backend is healthy, proceeding with signup');
      
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          fullName: trimmedFullName,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sign up');
      }
      
      const result = await response.json();
      console.log('[SignUp] Success - user created:', result.user.id);
      
      const userData: User = {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
      };
      
      await AsyncStorage.setItem('authToken', result.token);
      setUser(userData);
      await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
      await loadProfile(userData.id);
      await loadSubscription(userData.id);
      await loadDailyScans(userData.id);
      
      return { data: userData, error: null };
    } catch (error: any) {
      console.error('[SignUp] Error:', error);
      console.error('[SignUp] Error message:', error?.message);
      console.error('[SignUp] Error name:', error?.name);
      
      let errorMessage = 'Unable to create account at this time.';
      
      if (error?.message) {
        const msg = error.message;
        
        if (msg === 'BACKEND_NOT_AVAILABLE' || msg === 'BACKEND_NOT_CONFIGURED' || msg === 'BACKEND_TIMEOUT' || msg === 'BACKEND_NETWORK_ERROR' || msg === 'BACKEND_ERROR') {
          errorMessage = 'Cannot connect to authentication service. Please check your internet connection and try again.';
        } else if (msg.includes('backend') || 
            msg.includes('not available') || 
            msg.includes('not deployed') ||
            msg.includes('cannot connect') ||
            msg.includes('network') ||
            msg.includes('timeout') ||
            msg.toLowerCase().includes('guest mode')) {
          errorMessage = 'Cannot connect to authentication service. Please check your internet connection and try again.';
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
  }, [loadProfile, loadSubscription, loadDailyScans]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      
      console.log('[SignIn] Attempting sign in for:', trimmedEmail);
      
      console.log('[SignIn] Checking backend health...');
      const healthCheck = await checkBackendHealth();
      if (!healthCheck.isAvailable) {
        console.error('[SignIn] Backend is not available:', healthCheck.message);
        throw new Error('BACKEND_NOT_AVAILABLE');
      }
      console.log('[SignIn] Backend is healthy, proceeding with signin');
      
      const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sign in');
      }
      
      const result = await response.json();
      console.log('[SignIn] Success - user authenticated:', result.user.id);
      
      const userData: User = {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
      };
      
      await AsyncStorage.setItem('authToken', result.token);
      setUser(userData);
      await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
      await loadProfile(userData.id);
      await loadSubscription(userData.id);
      await loadDailyScans(userData.id);
      
      return { data: userData, error: null };
    } catch (error: any) {
      console.error('[SignIn] Error:', error);
      console.error('[SignIn] Error message:', error?.message);
      console.error('[SignIn] Error name:', error?.name);
      
      let errorMessage = 'Unable to sign in at this time.';
      
      if (error?.message) {
        const msg = error.message;
        
        if (msg === 'BACKEND_NOT_AVAILABLE' || msg === 'BACKEND_NOT_CONFIGURED' || msg === 'BACKEND_TIMEOUT' || msg === 'BACKEND_NETWORK_ERROR' || msg === 'BACKEND_ERROR') {
          errorMessage = 'Cannot connect to authentication service. Please check your internet connection and try again.';
        } else if (msg.includes('backend') || 
            msg.includes('not available') || 
            msg.includes('not deployed') ||
            msg.includes('cannot connect') ||
            msg.includes('network') ||
            msg.includes('timeout') ||
            msg.toLowerCase().includes('guest mode')) {
          errorMessage = 'Cannot connect to authentication service. Please check your internet connection and try again.';
        } else if (msg.toLowerCase().includes('invalid credentials') || msg.toLowerCase().includes('invalid email or password')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (msg.toLowerCase().includes('user not found')) {
          errorMessage = 'No account found with this email. Please sign up first.';
        } else if (msg.toLowerCase().includes('mongodb') || msg.toLowerCase().includes('database')) {
          errorMessage = 'Database service is unavailable. Please try again later.';
        } else {
          errorMessage = msg;
        }
      }
      
      return { data: null, error: { message: errorMessage } };
    }
  }, [loadProfile, loadSubscription, loadDailyScans]);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('currentUser');
      await AsyncStorage.removeItem('guestMode');
      await AsyncStorage.removeItem('authProvider');
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
      await trpcClient.auth.updateUser.mutate({
        userId: user.id,
        fullName: updates.full_name || undefined,
      });
      await loadProfile(user.id);
      return { error: null };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return { error };
    }
  }, [user, loadProfile]);

  const resetPassword = useCallback(async (_email: string) => {
    return { error: null };
  }, []);

  const incrementDailyScan = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (user) {
        await trpcClient.scans.incrementScan.mutate({ userId: user.id, date: today });
        await loadDailyScans(user.id);
      } else {
        const storedCount = await AsyncStorage.getItem('dailyScanCount');
        const newCount = parseInt(storedCount || '0', 10) + 1;
        await AsyncStorage.setItem('dailyScanCount', newCount.toString());
        setDailyScansRemaining(Math.max(0, 2 - newCount));
      }
    } catch (error) {
      console.error('Error incrementing daily scan:', error);
    }
  }, [user, loadDailyScans]);

  const addEarnedScan = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const storedDate = await AsyncStorage.getItem('lastAdClickDate');
      const storedClicks = await AsyncStorage.getItem('adClicksToday');
      
      if (storedDate !== today) {
        await AsyncStorage.setItem('lastAdClickDate', today);
        await AsyncStorage.setItem('adClicksToday', '1');
        setAdClicksToday(1);
        setLastAdClickDate(today);
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
      const today = new Date().toISOString().split('T')[0];
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
      await trpcClient.auth.deleteUser.mutate({ userId: user.id });
      await AsyncStorage.removeItem('currentUser');
      setUser(null);
      setProfile(null);
      setSubscription(null);
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting account:', error);
      return { error };
    }
  }, [user]);

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
        const signInResponse = await fetch(`${API_BASE_URL}/api/auth/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: oauthUser.email,
            password: oauthUser.id,
          }),
        });
        
        if (signInResponse.ok) {
          const result = await signInResponse.json();
          
          const userData: User = {
            id: result.user.id,
            email: result.user.email,
            fullName: result.user.fullName,
            authProvider: provider,
          };
          
          await AsyncStorage.setItem('authToken', result.token);
          setUser(userData);
          setAuthProvider(provider);
          await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
          await AsyncStorage.setItem('authProvider', provider);
          await loadProfile(userData.id);
          await loadSubscription(userData.id);
          await loadDailyScans(userData.id);
          
          return { data: userData, error: null };
        }
        
        const signInError = await signInResponse.json();
        if (signInError.error?.includes('Invalid') || signInError.error?.includes('not found')) {
          console.log(`[OAuth] User not found, creating new account`);
          
          const signUpResponse = await fetch(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: oauthUser.email,
              password: oauthUser.id,
              fullName: oauthUser.fullName,
            }),
          });
          
          if (!signUpResponse.ok) {
            const errorData = await signUpResponse.json();
            throw new Error(errorData.error || 'Failed to create account');
          }
          
          const createResult = await signUpResponse.json();
          
          const userData: User = {
            id: createResult.user.id,
            email: createResult.user.email,
            fullName: createResult.user.fullName,
            authProvider: provider,
          };
          
          await AsyncStorage.setItem('authToken', createResult.token);
          setUser(userData);
          setAuthProvider(provider);
          await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
          await AsyncStorage.setItem('authProvider', provider);
          await loadProfile(userData.id);
          await loadSubscription(userData.id);
          await loadDailyScans(userData.id);
          
          return { data: userData, error: null };
        }
        
        throw new Error(signInError.error || 'Failed to authenticate');
      } catch (oauthError: any) {
        throw oauthError;
      }
    } catch (error: any) {
      console.error(`[OAuth] ${provider} sign in error:`, error);
      console.error('[Auth] Error message:', error?.message);
      console.error('[Auth] Error name:', error?.name);
      console.error('[Auth] Full error:', JSON.stringify(error, null, 2));
      
      let errorMessage = `Failed to sign in with ${provider}. Please try again.`;
      
      if (error?.message) {
        const msg = error.message;
        
        if (msg === 'BACKEND_NOT_AVAILABLE' || msg === 'BACKEND_NOT_CONFIGURED' || msg === 'BACKEND_TIMEOUT' || msg === 'BACKEND_NETWORK_ERROR' || msg === 'BACKEND_ERROR') {
          errorMessage = 'Cannot connect to authentication service. Please check your internet connection and try again.';
        } else if (msg.includes('backend') || 
            msg.includes('not available') || 
            msg.includes('not deployed') ||
            msg.includes('cannot connect') ||
            msg.includes('network') ||
            msg.includes('timeout')) {
          errorMessage = 'Cannot connect to authentication service. Please check your internet connection and try again.';
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
  }, [loadProfile, loadSubscription, loadDailyScans]);

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
