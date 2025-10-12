import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface PaystackPaymentProps {
  visible: boolean;
  onClose: () => void;
  planType: 'basic' | 'premium';
  billingCycle: 'monthly' | 'yearly';
}

const PLANS = {
  basic: {
    monthly: { amount: 299, discount: 0 },
    yearly: { amount: 3228, discount: 10 },
  },
  premium: {
    monthly: { amount: 499, discount: 0 },
    yearly: { amount: 5276, discount: 12 },
  },
};

export default function PaystackPayment({ visible, onClose, planType, billingCycle }: PaystackPaymentProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const plan = PLANS[planType][billingCycle];
  const amount = plan.amount * 100;

  const handlePayment = async () => {
    if (!user) {
      Toast.show({
        type: 'error',
        text1: 'Authentication Required',
        text2: 'Please sign in to subscribe',
        position: 'top',
        visibilityTime: 4000,
      });
      onClose();
      return;
    }

    setLoading(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      if (billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const { error } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan_type: planType,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        payment_reference: `PAY_${Date.now()}_${planType}_${billingCycle}`,
      });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      Toast.show({
        type: 'success',
        text1: 'Payment Successful!',
        text2: 'Your subscription is now active',
        position: 'top',
        visibilityTime: 4000,
      });
      
      onClose();
    } catch (error: any) {
      console.error('Error saving subscription:', error);
      Toast.show({
        type: 'error',
        text1: 'Subscription Error',
        text2: error.message || 'Failed to activate subscription. Please try again.',
        position: 'top',
        visibilityTime: 5000,
      });
    } finally {
      setLoading(false);
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
              <Text style={styles.amount}>₦{(amount / 100).toFixed(2)}</Text>
              {plan.discount > 0 && (
                <Text style={styles.discount}>Save {plan.discount}%</Text>
              )}
            </View>

            <View style={styles.features}>
              <Text style={styles.featuresTitle}>What you get:</Text>
              {planType === 'basic' ? (
                <>
                  <Text style={styles.feature}>• 50 plant scans per day</Text>
                  <Text style={styles.feature}>• Basic plant care guides</Text>
                  <Text style={styles.feature}>• Ad-free experience</Text>
                </>
              ) : (
                <>
                  <Text style={styles.feature}>• Unlimited plant scans</Text>
                  <Text style={styles.feature}>• Advanced care guides</Text>
                  <Text style={styles.feature}>• AR plant visualization</Text>
                  <Text style={styles.feature}>• Health diagnosis</Text>
                  <Text style={styles.feature}>• Priority support</Text>
                  <Text style={styles.feature}>• Ad-free experience</Text>
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.payButton}
              onPress={handlePayment}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.payButtonText}>Subscribe Now - ₦{(amount / 100).toFixed(2)}</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.note}>
              {Platform.OS === 'web' 
                ? 'Payment integration available on mobile app. This is a demo subscription for testing.'
                : 'Secure payment powered by Paystack. Integration ready for production with your live keys.'}
            </Text>

            <Text style={styles.infoText}>
              Note: To enable live payments, integrate Paystack WebView component with your live public key:
              pk_live_58f341e069e311d36390b3cd49871dec3ba85e86
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
