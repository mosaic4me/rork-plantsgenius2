import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpcClient } from '@/lib/trpc';

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
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyScansRemaining, setDailyScansRemaining] = useState(2);
  const [isGuest, setIsGuest] = useState(false);
  const [lastResetDate, setLastResetDate] = useState<string | null>(null);

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
      
      console.log('[SignUp] Attempting to sign up user:', trimmedEmail);
      console.log('[SignUp] Backend URL check:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL || process.env.EXPO_PUBLIC_TOOLKIT_URL || 'Not set');
      
      console.log('[SignUp] Calling tRPC mutation...');
      const result = await trpcClient.auth.signUp.mutate({ 
        email: trimmedEmail, 
        password, 
        fullName: trimmedFullName 
      });
      console.log('[SignUp] Sign up successful:', result);
      
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
      console.error('[SignUp] Error signing up:', error);
      console.error('[SignUp] Error details:', {
        message: error.message,
        name: error.name,
        cause: error.cause,
        data: error.data,
        shape: error.shape,
      });
      
      let errorMessage = 'Failed to sign up. Please try again.';
      
      if (error.message) {
        if (error.message.includes('Backend is not available') || error.message.includes('Backend service is not available') || error.message.includes('Backend service not found') || error.message.includes('404') || error.message.includes('Not Found')) {
          errorMessage = 'Backend service is not available. Please use Guest Mode to continue.';
        } else if (error.message.includes('Backend URL not configured')) {
          errorMessage = 'Backend service is not configured. Please use Guest Mode.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('fetch failed') || error.message.includes('Network request failed')) {
          errorMessage = 'Unable to connect to server. Please use Guest Mode or check your internet connection.';
        } else if (error.message.includes('Failed to connect to database')) {
          errorMessage = 'Database connection error. Please try Guest Mode.';
        } else if (error.message.includes('already exists')) {
          errorMessage = error.message;
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return { data: null, error: { ...error, message: errorMessage } };
    }
  }, [loadProfile, loadSubscription, loadDailyScans]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      
      console.log('Attempting to sign in user:', trimmedEmail);
      const result = await trpcClient.auth.signIn.mutate({ 
        email: trimmedEmail, 
        password 
      });
      console.log('Sign in successful:', result);
      
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
      console.error('Error signing in:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        cause: error.cause,
      });
      
      let errorMessage = error.message || 'Failed to sign in';
      if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
      } else if (error.message?.includes('Invalid credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      }
      
      return { data: null, error: { ...error, message: errorMessage } };
    }
  }, [loadProfile, loadSubscription, loadDailyScans]);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('currentUser');
      await AsyncStorage.removeItem('guestMode');
      setUser(null);
      setProfile(null);
      setSubscription(null);
      setIsGuest(false);
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
    signUp,
    signIn,
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
    signUp,
    signIn,
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
