import * as Haptics from 'expo-haptics';
import { User, Scan, Leaf, Crown, Settings, Info, ChevronRight, Mail, LogOut, Trash2, CreditCard } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import PaystackPayment from '@/components/PaystackPayment';
import RewardedAd from '@/components/RewardedAd';
import { getDaysRemaining, getScanLimits } from '@/utils/paymentHelpers';
import { convertCurrency, formatCurrency, getUserLocation, isWestAfricanCountry } from '@/utils/currencyConverter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { stats } = useApp();
  const { profile, subscription, signOut, dailyScansRemaining, deleteAccount, isGuest, addEarnedScan, canEarnMoreScans, adClicksToday } = useAuth();
  const [showPayment, setShowPayment] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const [canEarnScans, setCanEarnScans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<{ type: 'basic' | 'premium'; cycle: 'monthly' | 'yearly' }>({ type: 'basic', cycle: 'monthly' });
  const [prices, setPrices] = useState({
    basicMonthly: '$2.99',
    basicYearly: '$32.28',
    premiumMonthly: '$4.99',
    premiumYearly: '$52.76',
  });
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  useEffect(() => {
    const initializePricing = async () => {
      try {
        const hasRequestedLocation = await AsyncStorage.getItem('hasRequestedLocationForCurrency');
        if (hasRequestedLocation === 'true') {
          return;
        }

        await AsyncStorage.setItem('hasRequestedLocationForCurrency', 'true');
        setIsLoadingPrices(true);

        const location = await getUserLocation();
        
        if (!location || !isWestAfricanCountry(location.country)) {
          return;
        }

        if (location.currency === 'NGN') {
          const basicMonthly = await convertCurrency(2.99, 'NGN');
          const basicYearly = await convertCurrency(32.28, 'NGN');
          const premiumMonthly = await convertCurrency(4.99, 'NGN');
          const premiumYearly = await convertCurrency(52.76, 'NGN');

          setPrices({
            basicMonthly: formatCurrency(basicMonthly.amount, basicMonthly.currency),
            basicYearly: formatCurrency(basicYearly.amount, basicYearly.currency),
            premiumMonthly: formatCurrency(premiumMonthly.amount, premiumMonthly.currency),
            premiumYearly: formatCurrency(premiumYearly.amount, premiumYearly.currency),
          });

          Toast.show({
            type: 'success',
            text1: 'Currency Updated',
            text2: 'Prices converted to Nigerian Naira',
            position: 'top',
            visibilityTime: 2000,
          });
        }
      } catch (error) {
        console.error('[Profile] Error initializing pricing:', error);
      } finally {
        setIsLoadingPrices(false);
      }
    };

    initializePricing();
  }, []);

  const handlePress = (action: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    switch (action) {
      case 'settings':
        router.push('/settings' as any);
        break;
      case 'billing':
        router.push('/billing' as any);
        break;
      case 'contact':
        router.push('/contact' as any);
        break;
      case 'logout':
        signOut();
        Toast.show({
          type: 'success',
          text1: 'Signed Out',
          text2: 'You have been successfully signed out',
          position: 'top',
        });
        setTimeout(() => {
          router.replace('/auth' as any);
        }, 500);
        break;
      case 'delete':
        setShowDeleteModal(true);
        break;
      default:
        console.log('Action:', action);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      const { error } = await deleteAccount();
      
      if (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.message || 'Failed to delete account',
          position: 'top',
        });
        return;
      }

      setShowDeleteModal(false);
      
      Toast.show({
        type: 'success',
        text1: 'Account Deleted',
        text2: 'Your account has been successfully deleted. Your subscription details are retained.',
        position: 'top',
        visibilityTime: 5000,
      });

      setTimeout(() => {
        router.replace('/auth' as any);
      }, 1000);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Something went wrong',
        position: 'top',
      });
    }
  };

  const handleSubscribe = (planType: 'basic' | 'premium', billingCycle: 'monthly' | 'yearly') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedPlan({ type: planType, cycle: billingCycle });
    setShowPayment(true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <User size={40} color={Colors.white} />
          </View>
          <Text style={styles.name}>{profile?.full_name || 'Plant Enthusiast'}</Text>
          <Text style={styles.email}>{profile?.email || 'user@plantgenius.com'}</Text>
          <View style={styles.subscriptionBadge}>
            <Crown size={16} color={subscription ? Colors.warning : Colors.gray.medium} />
            <Text style={styles.subscriptionText}>
              {subscription ? 
                (subscription.plan_type === 'basic' ? 'Basic Plan' : 'Premium Plan') : 
                'Free Plan'
              }
            </Text>
          </View>
          {subscription && subscription.status === 'active' ? (
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionDays}>
                {getDaysRemaining(subscription.end_date)} days remaining
              </Text>
              <Text style={styles.subscriptionExpiry}>
                Renews on {new Date(subscription.end_date).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.scansRemaining}>
                {dailyScansRemaining > 0 ? 
                  `${dailyScansRemaining} free scans remaining today` : 
                  'You have exhausted your free scans'
                }
              </Text>
              {dailyScansRemaining === 0 && (
                <TouchableOpacity
                  style={[styles.earnScanButton, (!canEarnScans || adClicksToday >= 2) && styles.earnScanButtonDisabled]}
                  onPress={async () => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    const canEarn = await canEarnMoreScans();
                    if (canEarn) {
                      setShowRewardedAd(true);
                    } else {
                      Toast.show({
                        type: 'info',
                        text1: 'Daily Limit Reached',
                        text2: 'You can earn up to 2 free scans per day',
                        position: 'top',
                      });
                    }
                  }}
                  disabled={!canEarnScans || adClicksToday >= 2}
                >
                  <Text style={styles.earnScanButtonText}>
                    {adClicksToday >= 2 ? 'Daily Limit Reached' : 'Earn a Free Scan'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Scan size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{stats.totalScans}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          <View style={styles.statCard}>
            <Leaf size={24} color={Colors.accent} />
            <Text style={styles.statValue}>{stats.plantsInGarden}</Text>
            <Text style={styles.statLabel}>In Garden</Text>
          </View>
          <View style={styles.statCard}>
            <Scan size={24} color={Colors.warning} />
            <Text style={styles.statValue}>{2 - dailyScansRemaining}</Text>
            <Text style={styles.statLabel}>Scans Today</Text>
          </View>
          <View style={styles.statCard}>
            <Scan size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{stats.totalScans}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>

        <View style={styles.premiumCard}>
          <View style={styles.premiumHeader}>
            <Crown size={32} color={Colors.warning} />
            <View style={styles.premiumTextContainer}>
              <Text style={styles.premiumTitle}>Upgrade Your Plan</Text>
              <Text style={styles.premiumSubtitle}>Choose the plan that fits your needs</Text>
            </View>
          </View>
          
          <View style={styles.planComparisonCard}>
            <Text style={styles.planComparisonTitle}>Current Plan: {subscription ? (subscription.plan_type === 'basic' ? 'Basic' : 'Premium') : 'Free'}</Text>
            <View style={styles.planPerks}>
              {subscription ? (
                subscription.plan_type === 'basic' ? (
                  <>
                    <Text style={styles.planPerk}>✓ {getScanLimits('basic').daily} scans per day</Text>
                    <Text style={styles.planPerk}>✓ {getScanLimits('basic').monthly} scans per month</Text>
                    <Text style={styles.planPerk}>✓ No ads</Text>
                    <Text style={styles.planPerk}>✓ Up to {getScanLimits('basic').gardenLimit} plants in garden</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.planPerk}>✓ {getScanLimits('premium').daily} scans per day</Text>
                    <Text style={styles.planPerk}>✓ {getScanLimits('premium').monthly} scans per month</Text>
                    <Text style={styles.planPerk}>✓ No ads</Text>
                    <Text style={styles.planPerk}>✓ Up to {getScanLimits('premium').gardenLimit} plants in garden</Text>
                    <Text style={styles.planPerk}>✓ Priority support</Text>
                  </>
                )
              ) : (
                <>
                  <Text style={styles.planPerk}>• {getScanLimits('free').daily} scans per day</Text>
                  <Text style={styles.planPerk}>• {getScanLimits('free').monthly} scans per month</Text>
                  <Text style={styles.planPerk}>• Limited garden capacity ({getScanLimits('free').gardenLimit} plants)</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.plansContainer}>
            <Text style={styles.plansTitle}>Available Plans</Text>
            
            <View style={styles.planCard}>
              <Text style={styles.planTitle}>Basic Plan</Text>
              <Text style={styles.planPrice}>{isLoadingPrices ? 'Loading...' : prices.basicMonthly}/month</Text>
              <Text style={styles.planSavings}>{isLoadingPrices ? 'Loading...' : prices.basicYearly}/year (Save 10%)</Text>
              
              <View style={styles.planFeatures}>
                <FeatureItem text="10 scans per day" />
                <FeatureItem text="150 scans per month" />
                <FeatureItem text="No ads" />
                <FeatureItem text="Add up to 5 plants in garden" />
                <FeatureItem text="Basic support" />
              </View>
              
              <TouchableOpacity
                style={styles.planButton}
                onPress={() => handleSubscribe('basic', 'monthly')}
              >
                <Text style={styles.planButtonText}>Subscribe Monthly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.planButton, styles.planButtonSecondary]}
                onPress={() => handleSubscribe('basic', 'yearly')}
              >
                <Text style={[styles.planButtonText, styles.planButtonTextSecondary]}>Subscribe Yearly</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.planCard, styles.planCardPremium]}>
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>
              <Text style={styles.planTitle}>Premium Plan</Text>
              <Text style={styles.planPrice}>{isLoadingPrices ? 'Loading...' : prices.premiumMonthly}/month</Text>
              <Text style={styles.planSavings}>{isLoadingPrices ? 'Loading...' : prices.premiumYearly}/year (Save 12%)</Text>
              
              <View style={styles.planFeatures}>
                <FeatureItem text="50 scans per day" />
                <FeatureItem text="600 scans per month" />
                <FeatureItem text="No ads" />
                <FeatureItem text="Add up to 50 plants in garden" />
                <FeatureItem text="Priority support" />
                <FeatureItem text="Advanced plant care tips" />
              </View>
              
              <TouchableOpacity
                style={styles.planButton}
                onPress={() => handleSubscribe('premium', 'monthly')}
              >
                <Text style={styles.planButtonText}>Subscribe Monthly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.planButton, styles.planButtonSecondary]}
                onPress={() => handleSubscribe('premium', 'yearly')}
              >
                <Text style={[styles.planButtonText, styles.planButtonTextSecondary]}>Subscribe Yearly</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <MenuItem
            icon={<Settings size={20} color={Colors.primary} />}
            title="Settings"
            subtitle="Edit profile, reset password"
            onPress={() => handlePress('settings')}
          />
          <MenuItem
            icon={<CreditCard size={20} color={Colors.primary} />}
            title="Billing & Subscription"
            subtitle="Manage your subscription and payment"
            onPress={() => handlePress('billing')}
          />
          <MenuItem
            icon={<Mail size={20} color={Colors.primary} />}
            title="Contact Us"
            subtitle="info@programmerscourt.com"
            onPress={() => handlePress('contact')}
          />
          <MenuItem
            icon={<Info size={20} color={Colors.primary} />}
            title="About"
            subtitle="Version 1.0.0"
            onPress={() => handlePress('about')}
          />
          <MenuItem
            icon={<Trash2 size={20} color={Colors.error} />}
            title="Delete Account"
            subtitle="Permanently delete your account"
            onPress={() => handlePress('delete')}
          />
          <MenuItem
            icon={<LogOut size={20} color={Colors.error} />}
            title="Sign Out"
            subtitle="Log out of your account"
            onPress={() => handlePress('logout')}
          />
        </View>

        <View style={styles.attribution}>
          <Text style={styles.copyrightText}>
            © 2025 Programmers&apos; Court LTD. All rights reserved.
          </Text>
        </View>
      </ScrollView>

      <PaystackPayment
        visible={showPayment}
        onClose={() => setShowPayment(false)}
        planType={selectedPlan.type}
        billingCycle={selectedPlan.cycle}
      />

      <RewardedAd
        visible={showRewardedAd}
        onClose={() => setShowRewardedAd(false)}
        onReward={async () => {
          await addEarnedScan();
          setShowRewardedAd(false);
          const canStillEarn = await canEarnMoreScans();
          setCanEarnScans(canStillEarn);
          Toast.show({
            type: 'success',
            text1: 'Reward Earned!',
            text2: 'You have earned 1 additional free scan',
            position: 'top',
          });
        }}
        duration={60}
      />

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Trash2 size={48} color={Colors.error} />
            </View>
            <Text style={styles.modalTitle}>Delete Account?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete your account? This action cannot be undone.
              {"\n\n"}
              Your subscription details will be retained in case you decide to return.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={handleDeleteAccount}
              >
                <Text style={styles.modalButtonTextDelete}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureCheck}>
        <Text style={styles.featureCheckText}>✓</Text>
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIcon}>
        <Text>{icon}</Text>
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={20} color={Colors.gray.medium} />
    </TouchableOpacity>
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
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: Colors.gray.dark,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  subscriptionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  scansRemaining: {
    fontSize: 14,
    color: Colors.gray.dark,
    marginTop: 8,
  },
  subscriptionInfo: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray.light,
  },
  subscriptionDays: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 4,
  },
  subscriptionExpiry: {
    fontSize: 13,
    color: Colors.gray.dark,
  },
  planPerks: {
    marginTop: 12,
    gap: 6,
  },
  planPerk: {
    fontSize: 13,
    color: Colors.gray.dark,
    lineHeight: 20,
  },
  earnScanButton: {
    marginTop: 12,
    backgroundColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  earnScanButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  earnScanButtonDisabled: {
    opacity: 0.5,
    backgroundColor: Colors.gray.medium,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.black,
    marginTop: 10,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.gray.dark,
    textAlign: 'center',
  },
  premiumCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 24,
    borderRadius: 20,
    backgroundColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 16,
    color: Colors.gray.dark,
  },
  premiumFeatures: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureCheckText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  featureText: {
    fontSize: 16,
    color: Colors.black,
  },
  planComparisonCard: {
    backgroundColor: Colors.gray.light,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  planComparisonTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.black,
    textAlign: 'center',
  },
  planFeatures: {
    gap: 8,
    marginBottom: 16,
  },
  plansContainer: {
    gap: 16,
  },
  plansTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 8,
  },
  planCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.gray.light,
  },
  planCardPremium: {
    borderColor: Colors.accent,
    backgroundColor: '#F1F8E9',
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 4,
  },
  planSavings: {
    fontSize: 14,
    color: Colors.accent,
    marginBottom: 16,
  },
  planButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  planButtonSecondary: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  planButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  planButtonTextSecondary: {
    color: Colors.primary,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.white,
  },

  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: Colors.gray.dark,
  },
  attribution: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  attributionText: {
    fontSize: 12,
    color: Colors.gray.medium,
    textAlign: 'center',
    marginBottom: 8,
  },
  copyrightText: {
    fontSize: 11,
    color: Colors.gray.medium,
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: Colors.gray.dark,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.gray.light,
  },
  modalButtonDelete: {
    backgroundColor: Colors.error,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.black,
  },
  modalButtonTextDelete: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
