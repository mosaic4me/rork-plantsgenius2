import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpcClient } from '@/lib/trpc';
import { signInWithGoogle, signInWithApple, type OAuthUser } from '@/utils/oauthHelpers';
import { checkBackendHealth } from '@/utils/backendHealthCheck';

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

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const user = await trpcClient.auth.getUser.query({ userId });
      if (user) {
        setProfile({
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          avatar_url: null,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, []);

  const loadSubscription = useCallback(async (userId: string) => {
    try {
      const sub = await trpcClient.subscription.getSubscription.query({ userId });
      if (sub) {
        setSubscription({
          id: sub.id,
          plan_type: sub.planType,
          status: sub.status,
          start_date: sub.startDate,
          end_date: sub.endDate,
        });
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  }, []);

  const loadDailyScans = useCallback(async (userId?: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (userId) {
        const result = await trpcClient.scans.getDailyScans.query({ userId, date: today });
        setDailyScansRemaining(result.scansRemaining);
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
    } catch (error) {
      console.error('Error loading daily scans:', error);
    }
  }, []);

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
          await loadProfile(userData.id);
          await loadSubscription(userData.id);
          await loadDailyScans(userData.id);
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
      
      const result = await trpcClient.auth.signUp.mutate({ 
        email: trimmedEmail, 
        password, 
        fullName: trimmedFullName 
      });
      
      console.log('[SignUp] Success - user created:', result.id);
      
      const userData: User = {
        id: result.id,
        email: result.email,
        fullName: result.fullName,
      };
      
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
      
      const result = await trpcClient.auth.signIn.mutate({ 
        email: trimmedEmail, 
        password 
      });
      
      console.log('[SignIn] Success - user authenticated:', result.id);
      
      const userData: User = {
        id: result.id,
        email: result.email,
        fullName: result.fullName,
      };
      
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
        const result = await trpcClient.auth.signIn.mutate({
          email: oauthUser.email,
          password: oauthUser.id,
        });
        
        const userData: User = {
          id: result.id,
          email: result.email,
          fullName: result.fullName,
          authProvider: provider,
        };
        
        setUser(userData);
        setAuthProvider(provider);
        await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
        await AsyncStorage.setItem('authProvider', provider);
        await loadProfile(userData.id);
        await loadSubscription(userData.id);
        await loadDailyScans(userData.id);
        
        return { data: userData, error: null };
      } catch (signInError: any) {
        if (signInError.message?.includes('Invalid credentials') || 
            signInError.message?.includes('User not found')) {
          console.log(`[OAuth] User not found, creating new account`);
          
          const createResult = await trpcClient.auth.signUp.mutate({
            email: oauthUser.email,
            password: oauthUser.id,
            fullName: oauthUser.fullName,
          });
          
          const userData: User = {
            id: createResult.id,
            email: createResult.email,
            fullName: createResult.fullName,
            authProvider: provider,
          };
          
          setUser(userData);
          setAuthProvider(provider);
          await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
          await AsyncStorage.setItem('authProvider', provider);
          await loadProfile(userData.id);
          await loadSubscription(userData.id);
          await loadDailyScans(userData.id);
          
          return { data: userData, error: null };
        }
        throw signInError;
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
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
    resetPassword,
    incrementDailyScan,
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
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
    resetPassword,
    incrementDailyScan,
    hasActiveSubscription,
    canScan,
    continueAsGuest,
    deleteAccount,
  ]);
});
