import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreditCard, Calendar, Clock, TrendingUp, Crown, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import InAppPayment from '@/components/InAppPayment';
import { getDaysRemaining, getScanLimits } from '@/utils/paymentHelpers';
import type { PlanType, BillingCycle } from '@/utils/paymentHelpers';
import Colors from '@/constants/colors';

export default function BillingScreen() {
  const insets = useSafeAreaInsets();
  const { subscription, dailyScansRemaining } = useAuth();
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ type: PlanType; cycle: BillingCycle }>({ 
    type: 'basic', 
    cycle: 'monthly' 
  });

  const currentPlan = subscription?.plan_type || 'free';
  const planLimits = getScanLimits(currentPlan);
  const daysRemaining = subscription?.end_date ? getDaysRemaining(subscription.end_date) : 0;
  const isActive = subscription?.status === 'active';

  const handleUpgrade = (planType: PlanType, billingCycle: BillingCycle) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedPlan({ type: planType, cycle: billingCycle });
    setShowPayment(true);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Billing & Subscription',
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.white,
        }}
      />
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.currentPlanCard}>
            <View style={styles.currentPlanHeader}>
              <Crown
                size={32}
                color={isActive ? Colors.warning : Colors.gray.medium}
                fill={isActive ? Colors.warning : 'transparent'}
              />
              <View style={styles.currentPlanInfo}>
                <Text style={styles.currentPlanTitle}>
                  {currentPlan === 'free' ? 'Free Plan' : currentPlan === 'basic' ? 'Basic Plan' : 'Premium Plan'}
                </Text>
                <Text style={styles.currentPlanStatus}>
                  {isActive ? `Active until ${new Date(subscription.end_date).toLocaleDateString()}` : 'No active subscription'}
                </Text>
              </View>
            </View>

            {isActive && (
              <View style={styles.daysRemainingBadge}>
                <Clock size={16} color={Colors.white} />
                <Text style={styles.daysRemainingText}>
                  {daysRemaining} days remaining
                </Text>
              </View>
            )}
          </View>

          <View style={styles.usageCard}>
            <Text style={styles.sectionTitle}>Scan Usage</Text>
            
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>Today&apos;s Scans</Text>
              <Text style={styles.usageValue}>
                {planLimits.daily - dailyScansRemaining} / {planLimits.daily}
              </Text>
            </View>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${((planLimits.daily - dailyScansRemaining) / planLimits.daily) * 100}%`,
                  },
                ]}
              />
            </View>

            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>Monthly Limit</Text>
              <Text style={styles.usageValue}>{planLimits.monthly} scans</Text>
            </View>

            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>Garden Capacity</Text>
              <Text style={styles.usageValue}>{planLimits.gardenLimit} plants</Text>
            </View>
          </View>

          {subscription && isActive && (
            <View style={styles.billingHistoryCard}>
              <Text style={styles.sectionTitle}>Billing Information</Text>
              
              <View style={styles.infoRow}>
                <CreditCard size={20} color={Colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Payment Method</Text>
                  <Text style={styles.infoValue}>{Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Calendar size={20} color={Colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Next Billing Date</Text>
                  <Text style={styles.infoValue}>
                    {new Date(subscription.end_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <TrendingUp size={20} color={Colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Subscription Status</Text>
                  <Text style={[styles.infoValue, styles.activeStatus]}>
                    {subscription.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.upgradeSection}>
            <Text style={styles.sectionTitle}>Available Plans</Text>
            <Text style={styles.sectionSubtitle}>
              Upgrade or change your subscription
            </Text>

            <View style={styles.planCard}>
              <Text style={styles.planTitle}>Basic Plan</Text>
              <Text style={styles.planPrice}>From $2.99/month</Text>
              <View style={styles.planFeatures}>
                <Text style={styles.planFeature}>• 10 scans per day</Text>
                <Text style={styles.planFeature}>• 150 scans per month</Text>
                <Text style={styles.planFeature}>• No ads</Text>
                <Text style={styles.planFeature}>• 5 plants in garden</Text>
              </View>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => handleUpgrade('basic', 'monthly')}
                disabled={currentPlan === 'basic'}
              >
                <Text style={styles.upgradeButtonText}>
                  {currentPlan === 'basic' ? 'Current Plan' : 'Upgrade'}
                </Text>
                {currentPlan !== 'basic' && <ArrowRight size={20} color={Colors.white} />}
              </TouchableOpacity>
            </View>

            <View style={[styles.planCard, styles.premiumCard]}>
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>
              <Text style={styles.planTitle}>Premium Plan</Text>
              <Text style={styles.planPrice}>From $4.99/month</Text>
              <View style={styles.planFeatures}>
                <Text style={styles.planFeature}>• 50 scans per day</Text>
                <Text style={styles.planFeature}>• 600 scans per month</Text>
                <Text style={styles.planFeature}>• No ads</Text>
                <Text style={styles.planFeature}>• 50 plants in garden</Text>
                <Text style={styles.planFeature}>• Priority support</Text>
              </View>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => handleUpgrade('premium', 'monthly')}
                disabled={currentPlan === 'premium'}
              >
                <Text style={styles.upgradeButtonText}>
                  {currentPlan === 'premium' ? 'Current Plan' : 'Upgrade'}
                </Text>
                {currentPlan !== 'premium' && <ArrowRight size={20} color={Colors.white} />}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <InAppPayment
          visible={showPayment}
          onClose={() => setShowPayment(false)}
          planType={selectedPlan.type}
          billingCycle={selectedPlan.cycle}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  currentPlanCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  currentPlanInfo: {
    flex: 1,
  },
  currentPlanTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  currentPlanStatus: {
    fontSize: 14,
    color: Colors.gray.dark,
  },
  daysRemainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 8,
  },
  daysRemainingText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  usageCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.gray.dark,
    marginBottom: 20,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  usageLabel: {
    fontSize: 16,
    color: Colors.gray.dark,
  },
  usageValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.black,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.gray.light,
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  billingHistoryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.gray.medium,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.black,
  },
  activeStatus: {
    color: Colors.accent,
  },
  upgradeSection: {
    marginTop: 8,
  },
  planCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.gray.light,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  premiumCard: {
    borderColor: Colors.accent,
    backgroundColor: '#F1F8E9',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 16,
    fontWeight: '600' as const,
  },
  planFeatures: {
    gap: 8,
    marginBottom: 20,
  },
  planFeature: {
    fontSize: 14,
    color: Colors.gray.dark,
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
