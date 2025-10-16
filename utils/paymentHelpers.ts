import { Platform } from 'react-native';
import { getUserLocation, isWestAfricanCountry, convertCurrency } from './currencyConverter';

export type PaymentMethod = 'google-pay' | 'apple-pay' | 'paystack';
export type PlanType = 'basic' | 'premium';
export type BillingCycle = 'monthly' | 'yearly';

interface PlanPrice {
  monthly: number;
  yearly: number;
}

const PLAN_PRICES: Record<PlanType, PlanPrice> = {
  basic: {
    monthly: 2.99,
    yearly: 32.28,
  },
  premium: {
    monthly: 4.99,
    yearly: 52.76,
  },
};

interface PaymentDetails {
  planType: PlanType;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  symbol: string;
}

export async function getPaymentDetails(
  planType: PlanType,
  billingCycle: BillingCycle
): Promise<PaymentDetails> {
  const baseAmount = PLAN_PRICES[planType][billingCycle];
  const converted = await convertCurrency(baseAmount);

  return {
    planType,
    billingCycle,
    amount: converted.amount,
    currency: converted.currency,
    symbol: converted.symbol,
  };
}

export async function determinePaymentMethod(): Promise<PaymentMethod> {
  const location = await getUserLocation();
  
  if (location && isWestAfricanCountry(location.country)) {
    return 'paystack';
  }
  
  if (Platform.OS === 'ios') {
    return 'apple-pay';
  }
  
  if (Platform.OS === 'android') {
    return 'google-pay';
  }
  
  return 'paystack';
}

export interface SubscriptionPayload {
  userId: string;
  planType: PlanType;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentReference: string;
}

export function calculateSubscriptionEndDate(billingCycle: BillingCycle): Date {
  const now = new Date();
  
  if (billingCycle === 'monthly') {
    now.setMonth(now.getMonth() + 1);
  } else {
    now.setFullYear(now.getFullYear() + 1);
  }
  
  return now;
}

export function getDaysRemaining(endDate: string | Date): number {
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function getScanLimits(planType: 'free' | PlanType): { daily: number; monthly: number; gardenLimit: number } {
  switch (planType) {
    case 'basic':
      return { daily: 10, monthly: 150, gardenLimit: 5 };
    case 'premium':
      return { daily: 50, monthly: 600, gardenLimit: 50 };
    default:
      return { daily: 2, monthly: 60, gardenLimit: 3 };
  }
}
