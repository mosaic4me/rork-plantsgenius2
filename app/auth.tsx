import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import Toast from 'react-native-toast-message';
import { Mail, Lock, User } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithOAuth, continueAsGuest } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOAuthLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showAppleSignIn, setShowAppleSignIn] = useState(false);

  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setShowAppleSignIn);
    }
  }, []);

  const handleAuth = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedFullName = fullName.trim();

    if (!trimmedEmail || !trimmedPassword || (isSignUp && !trimmedFullName)) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please fill in all fields',
        position: 'top',
      });
      return;
    }

    setLoading(true);
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      if (isSignUp) {
        const { error } = await signUp(trimmedEmail, trimmedPassword, trimmedFullName);
        if (error) {
          if (error.message.includes('already exists')) {
            Toast.show({
              type: 'info',
              text1: 'Account Already Exists',
              text2: 'This email is already registered. Please try logging in or use a different email.',
              position: 'top',
              visibilityTime: 5000,
            });
          } else {
            throw error;
          }
          return;
        }

        Toast.show({
          type: 'success',
          text1: 'Account Created!',
          text2: 'Welcome to PlantsGenius',
          position: 'top',
        });
      } else {
        const { error } = await signIn(trimmedEmail, trimmedPassword);
        if (error) throw error;

        Toast.show({
          type: 'success',
          text1: 'Welcome Back!',
          text2: 'Successfully signed in',
          position: 'top',
        });
      }

      router.replace('/(tabs)' as any);
    } catch (error: any) {
      console.error('[Auth] Error:', error);
      console.error('[Auth] Error type:', typeof error);
      console.error('[Auth] Error keys:', error ? Object.keys(error) : 'null');
      
      let errorMessage = error?.message || 'Something went wrong. Please try Guest Mode.';
      
      const msg = errorMessage.toLowerCase();
      const isBackendError = msg.includes('service') || 
                             msg.includes('unavailable') || 
                             msg.includes('guest mode') ||
                             msg.includes('backend') ||
                             msg.includes('cannot connect') ||
                             msg.includes('network') ||
                             msg.includes('timeout');
      
      Toast.show({
        type: isBackendError ? 'info' : 'error',
        text1: isBackendError ? 'Service Unavailable' : 'Authentication Error',
        text2: errorMessage,
        position: 'top',
        visibilityTime: 6000,
      });
    } finally {
      setLoading(false);
    }
  };



  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setOAuthLoading(true);
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const { data, error } = await signInWithOAuth(provider);
      
      if (error) {
        Toast.show({
          type: 'error',
          text1: `${provider === 'google' ? 'Google' : 'Apple'} Sign In Failed`,
          text2: error.message,
          position: 'top',
          visibilityTime: 5000,
        });
        return;
      }

      if (data) {
        Toast.show({
          type: 'success',
          text1: 'Welcome!',
          text2: `Signed in with ${provider === 'google' ? 'Google' : 'Apple'}`,
          position: 'top',
        });
        router.replace('/(tabs)' as any);
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Something went wrong',
        position: 'top',
      });
    } finally {
      setOAuthLoading(false);
    }
  };

  const handleGuestMode = async () => {
    setLoading(true);
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      await continueAsGuest();

      Toast.show({
        type: 'success',
        text1: 'Guest Mode',
        text2: 'You can explore the app with limited features',
        position: 'top',
      });

      router.replace('/(tabs)' as any);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Something went wrong',
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: 'https://r2-pub.rork.com/generated-images/b52b2347-5e0a-4a18-9102-7b8a756bf443.png' }}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>PlantsGenius</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Create your account' : 'Welcome back!'}
          </Text>
        </View>

        <View style={styles.form}>
          {isSignUp && (
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <User size={20} color={Colors.gray.dark} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholderTextColor={Colors.gray.medium}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Mail size={20} color={Colors.gray.dark} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor={Colors.gray.medium}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Lock size={20} color={Colors.gray.dark} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              placeholderTextColor={Colors.gray.medium}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.authButton, (loading || oauthLoading) && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading || oauthLoading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.authButtonText}>
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.oauthButton, styles.googleButton, (loading || oauthLoading) && styles.buttonDisabled]}
            onPress={() => handleOAuthSignIn('google')}
            disabled={loading || oauthLoading}
            activeOpacity={0.8}
          >
            {oauthLoading ? (
              <ActivityIndicator color={Colors.black} />
            ) : (
              <>
                <Image
                  source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }}
                  style={styles.googleIcon}
                />
                <Text style={styles.oauthButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {showAppleSignIn && (
            <TouchableOpacity
              style={[styles.oauthButton, styles.appleButton, (loading || oauthLoading) && styles.buttonDisabled]}
              onPress={() => handleOAuthSignIn('apple')}
              disabled={loading || oauthLoading}
              activeOpacity={0.8}
            >
              {oauthLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.appleIcon}></Text>
                  <Text style={styles.appleButtonText}>Continue with Apple</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setIsSignUp(!isSignUp);
            }}
          >
            <Text style={styles.switchButtonText}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={styles.switchButtonTextBold}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.guestButton, (loading || oauthLoading) && styles.buttonDisabled]}
            onPress={handleGuestMode}
            disabled={loading || oauthLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    padding: 10,
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray.dark,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gray.light,
  },
  inputIcon: {
    padding: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 16,
    fontSize: 16,
    color: Colors.black,
  },
  authButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  authButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray.light,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: Colors.gray.medium,
    fontWeight: '600' as const,
  },
  oauthButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 12,
  },
  googleButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray.light,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  oauthButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.black,
  },
  appleButton: {
    backgroundColor: Colors.black,
    borderWidth: 0,
  },
  appleIcon: {
    fontSize: 24,
    color: Colors.white,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  switchButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: 15,
    color: Colors.gray.dark,
  },
  switchButtonTextBold: {
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  guestButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray.light,
    backgroundColor: Colors.white,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.gray.dark,
  },
});
