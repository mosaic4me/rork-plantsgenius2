import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getPaymentDetails } from '@/utils/paymentHelpers';
import type { PlanType, BillingCycle } from '@/utils/paymentHelpers';
import { trpcClient } from '@/lib/trpc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

interface InAppPaymentProps {
  visible: boolean;
  onClose: () => void;
  planType: PlanType;
  billingCycle: BillingCycle;
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

      console.log('[Payment] Creating subscription via tRPC...');
      
      let subscriptionData;
      try {
        subscriptionData = await trpcClient.subscription.createSubscription.mutate({
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
        });
        console.log('[Payment] Subscription created via tRPC:', subscriptionData);
      } catch (trpcError: any) {
        console.log('[Payment] tRPC error:', trpcError.message);
        
        if (
          trpcError.message?.includes('BACKEND_NOT_AVAILABLE') ||
          trpcError.message?.includes('404') ||
          trpcError.message?.includes('BACKEND_NETWORK_ERROR')
        ) {
          console.log('[Payment] Backend unavailable, using direct REST API...');
          
          const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.plantsgenius.site';
          
          let token: string | null = null;
          try {
            if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
              token = await AsyncStorage.getItem('authToken');
            } else {
              token = await SecureStore.getItemAsync('authToken');
            }
          } catch (error) {
            console.log('[Payment] Could not access auth token:', error);
          }
          
          if (!token) {
            throw new Error('Not authenticated');
          }
          
          const response = await fetch(`${baseUrl}/api/subscription/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
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
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('[Payment] REST API error:', errorText);
            throw new Error(`Failed to create subscription: ${response.status}`);
          }
          
          subscriptionData = await response.json();
          console.log('[Payment] Subscription created via REST API:', subscriptionData);
        } else {
          throw trpcError;
        }
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
      
      if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('not authenticated')) {
        errorMessage = 'Your session has expired. Please sign in again.';
      } else if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('too many') || errorMessage.toLowerCase().includes('rate')) {
        errorMessage = 'Too many payment requests. Please wait a few moments before trying again.';
      } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (errorMessage.toLowerCase().includes('backend') || errorMessage.includes('404') || errorMessage.includes('503')) {
        errorMessage = 'Service temporarily unavailable. Please try again in a few minutes.';
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
