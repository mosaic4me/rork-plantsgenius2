import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { ArrowLeft, User, Mail, Lock, Scan } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, resetPassword, dailyScansRemaining, hasActiveSubscription, authProvider } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [loading, setLoading] = useState(false);
  const isOAuthUser = authProvider === 'google' || authProvider === 'apple';

  const handleSave = async () => {
    if (!fullName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Full name cannot be empty',
        position: 'top',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await updateProfile({ full_name: fullName });
      if (error) {
        const errorMessage = typeof error === 'string' ? error : error.message || 'Failed to update profile';
        throw new Error(errorMessage);
      }

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Profile updated successfully!',
        position: 'top',
      });
    } catch (error: any) {
      console.error('[Settings] Error updating profile:', error);
      const errorMessage = error?.message || 'Failed to update profile';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) return;

    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Password reset email sent! Check your inbox.',
        position: 'top',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to send reset email: ' + error.message,
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scan Usage</Text>

          <View style={styles.infoCard}>
            <Scan size={20} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                {hasActiveSubscription() ? 'Unlimited Scans' : `${dailyScansRemaining} Free Scans Remaining`}
              </Text>
              <Text style={styles.infoDescription}>
                {hasActiveSubscription() 
                  ? 'You have unlimited plant scans with your premium subscription'
                  : `You have ${dailyScansRemaining} free scans left today. Resets daily at midnight.`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>

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
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Mail size={20} color={Colors.gray.dark} />
            </View>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              placeholder="Email"
              value={email}
              editable={false}
              placeholderTextColor={Colors.gray.medium}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={[styles.buttonText, styles.buttonPrimaryText]}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>

        {!isOAuthUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>

            <View style={styles.infoCard}>
              <Lock size={20} color={Colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Reset Password</Text>
                <Text style={styles.infoDescription}>
                  Send a password reset link to your email
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray.light,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.black,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 20,
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
  inputDisabled: {
    color: Colors.gray.medium,
  },
  button: {
    backgroundColor: Colors.white,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  buttonTextSecondary: {
    color: Colors.primary,
  },
  buttonPrimaryText: {
    color: Colors.white,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: Colors.gray.dark,
    lineHeight: 20,
  },
});
