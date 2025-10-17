import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getPaymentDetails } from '@/utils/paymentHelpers';
import type { PlanType, BillingCycle } from '@/utils/paymentHelpers';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.plantsgenius.site').replace(/\/$/, '');

interface InAppPaymentProps {
  visible: boolean;
  onClose: () => void;
  planType: PlanType;
  billingCycle: BillingCycle;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Payment] Attempt ${attempt + 1}/${maxRetries} to ${url}`);
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter 
          ? parseInt(retryAfter) * 1000 
          : initialDelay * Math.pow(2, attempt);
        
        console.log(`[Payment] Rate limited. Waiting ${waitTime}ms before retry...`);
        
        if (attempt < maxRetries - 1) {
          await delay(waitTime);
          continue;
        }
      }
      
      return response;
    } catch (error: any) {
      console.log(`[Payment] Attempt ${attempt + 1} failed:`, error.message);
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const waitTime = initialDelay * Math.pow(2, attempt);
        console.log(`[Payment] Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
      }
    }
  }
  
  throw lastError || new Error('Request failed after all retries');
}

export default function InAppPayment({ visible, onClose, planType, billingCycle }: InAppPaymentProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    amount: number;
    currency: string;
    symbol: string;
    formattedAmount: string;
  } | null>(null);
  const lastRequestTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  const loadPaymentDetails = useCallback(async () => {
    try {
      const details = await getPaymentDetails(planType, billingCycle);
      setPaymentDetails({
        amount: details.amount,
        currency: details.currency,
        symbol: details.symbol,
        formattedAmount: `${details.symbol}${details.amount.toLocaleString()}`,
      });
    } catch (error) {
      console.error('[Payment] Error loading details:', error);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Error',
          body: 'Failed to load payment details',
        },
        trigger: null,
      });
    }
  }, [planType, billingCycle]);

  useEffect(() => {
    if (visible) {
      loadPaymentDetails();
    }
  }, [visible, planType, billingCycle, loadPaymentDetails]);

  const handlePayment = async () => {
    if (isProcessingRef.current) {
      console.log('[Payment] Already processing a payment request');
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    const minRequestInterval = 3000;
    
    if (timeSinceLastRequest < minRequestInterval) {
      const waitTime = minRequestInterval - timeSinceLastRequest;
      console.log(`[Payment] Throttling request. Please wait ${Math.ceil(waitTime / 1000)} seconds`);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Please Wait',
          body: `Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again`,
        },
        trigger: null,
      });
      return;
    }

    if (!user) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Authentication Required',
          body: 'Please sign in to subscribe',
        },
        trigger: null,
      });
      onClose();
      return;
    }

    if (Platform.OS === 'web') {
      Alert.alert(
        'Payment Not Available',
        'In-app purchases are only available on mobile devices. Please use the mobile app to subscribe.',
        [{ text: 'OK' }]
      );
      return;
    }

    isProcessingRef.current = true;
    lastRequestTimeRef.current = now;
    setLoading(true);
    try {
      const paymentMethod = Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay';
      
      const startDate = new Date();
      const endDate = new Date();
      if (billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const paymentReference = `${Platform.OS.toUpperCase()}_${Date.now()}_${planType}_${billingCycle}`;

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetchWithRetry(
        `${API_BASE_URL}/api/subscription`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            planType: planType,
            billingCycle: billingCycle,
            status: 'active',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            paymentReference: paymentReference,
            amount: paymentDetails?.amount || 0,
            currency: paymentDetails?.currency || 'USD',
            paymentMethod: paymentMethod,
          }),
        },
        3,
        2000
      );

      const contentType = response.headers.get('content-type');
      console.log('[Payment] Response status:', response.status);
      console.log('[Payment] Response content-type:', contentType);

      if (!response.ok) {
        let errorMessage = 'Failed to create subscription';
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            console.log('[Payment] Error JSON:', errorData);
            errorMessage = errorData.error || errorData.message || errorMessage;
          } else {
            const errorText = await response.text();
            console.log('[Payment] Error text response:', errorText.substring(0, 200));
            
            if (response.status === 429) {
              errorMessage = 'Too many payment requests. Please wait a few moments and try again.';
            } else if (response.status >= 500) {
              errorMessage = 'Server is temporarily unavailable. Please try again in a few moments.';
            } else {
              errorMessage = `Server error (${response.status}): ${errorText.substring(0, 100)}`;
            }
          }
        } catch (parseError) {
          console.error('[Payment] Error parsing response:', parseError);
          if (response.status === 429) {
            errorMessage = 'Too many payment requests. Please wait a few moments and try again.';
          } else {
            errorMessage = `Request failed with status ${response.status}`;
          }
        }
        throw new Error(errorMessage);
      }

      let subscriptionData;
      try {
        const contentTypeSuccess = response.headers.get('content-type');
        if (!contentTypeSuccess || !contentTypeSuccess.includes('application/json')) {
          const textResponse = await response.text();
          console.log('[Payment] Non-JSON success response:', textResponse.substring(0, 200));
          throw new Error('Server returned non-JSON response');
        }
        subscriptionData = await response.json();
        console.log('[Payment] Success response:', subscriptionData);
      } catch (parseError: any) {
        console.error('[Payment] Error parsing success response:', parseError);
        if (parseError.message?.includes('non-JSON')) {
          throw parseError;
        }
        throw new Error('Failed to process server response');
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Payment Successful!',
          body: 'Your subscription is now active',
        },
        trigger: null,
      });
      
      onClose();
    } catch (error: any) {
      console.error('ERROR Error processing payment:', error);
      console.error('[Payment] Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        type: typeof error,
      });
      
      let errorMessage = error.message || 'Failed to activate subscription. Please try again.';
      
      if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('too many')) {
        errorMessage = 'Too many payment requests. Please wait a few moments before trying again.';
      } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Subscription Error',
          body: errorMessage,
        },
        trigger: null,
      });
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Complete Payment</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.black} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.planCard}>
              <Text style={styles.planName}>
                {planType === 'basic' ? 'Basic Plan' : 'Premium Plan'}
              </Text>
              <Text style={styles.billingCycle}>
                {billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}
              </Text>
              {paymentDetails ? (
                <Text style={styles.amount}>{paymentDetails.formattedAmount}</Text>
              ) : (
                <ActivityIndicator color={Colors.white} />
              )}
              {billingCycle === 'yearly' && (
                <Text style={styles.discount}>
                  Save {planType === 'basic' ? '10%' : '12%'}
                </Text>
              )}
            </View>

            <View style={styles.features}>
              <Text style={styles.featuresTitle}>What you get:</Text>
              {planType === 'basic' ? (
                <>
                  <Text style={styles.feature}>• 10 scans per day</Text>
                  <Text style={styles.feature}>• 150 scans per month</Text>
                  <Text style={styles.feature}>• No ads</Text>
                  <Text style={styles.feature}>• Add up to 5 plants in garden</Text>
                  <Text style={styles.feature}>• Basic support</Text>
                </>
              ) : (
                <>
                  <Text style={styles.feature}>• 50 scans per day</Text>
                  <Text style={styles.feature}>• 600 scans per month</Text>
                  <Text style={styles.feature}>• No ads</Text>
                  <Text style={styles.feature}>• Add up to 50 plants in garden</Text>
                  <Text style={styles.feature}>• Priority support</Text>
                  <Text style={styles.feature}>• Advanced plant care tips</Text>
                </>
              )}
            </View>

            <TouchableOpacity
              style={[styles.payButton, (!paymentDetails || loading) && styles.payButtonDisabled]}
              onPress={handlePayment}
              disabled={!paymentDetails || loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : paymentDetails ? (
                <Text style={styles.payButtonText}>
                  {Platform.OS === 'ios' ? '🍎 Pay with Apple Pay' : '💳 Pay with Google Pay'} - {paymentDetails.formattedAmount}
                </Text>
              ) : (
                <Text style={styles.payButtonText}>Loading...</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.note}>
              {Platform.OS === 'web' 
                ? 'In-app purchases available on mobile app only.'
                : `Secure payment powered by ${Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay'}`}
            </Text>

            <Text style={styles.infoText}>
              Your subscription will automatically renew unless cancelled before the renewal date.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray.light,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.black,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  planCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 4,
  },
  billingCycle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 16,
  },
  amount: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  discount: {
    fontSize: 14,
    color: Colors.accent,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    fontWeight: '600' as const,
  },
  features: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 12,
  },
  feature: {
    fontSize: 15,
    color: Colors.gray.dark,
    marginBottom: 8,
    lineHeight: 22,
  },
  payButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  note: {
    fontSize: 12,
    color: Colors.gray.medium,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 11,
    color: Colors.gray.medium,
    textAlign: 'center',
    lineHeight: 16,
  },
});
