import { SubscriptionPlanId } from '../types';

/**
 * Maps plan ID to its exact duration in days:
 * - 1-Month Plan: 30 days
 * - Starter Plan (3 Months): 90 days
 * - Pro Plan (6 Months): 180 days
 * - Enterprise Plan (12 Months): 365 days
 */
export const getPlanDurationInDays = (planId?: string): number => {
  if (!planId) return 30;
  
  if (planId === 'enterprise_12m' || planId.toLowerCase().includes('12') || planId.toLowerCase().includes('enterprise')) {
    return 365;
  }
  if (planId === 'pro_6m' || planId.toLowerCase().includes('6') || planId.toLowerCase().includes('pro')) {
    return 180;
  }
  if (planId === 'starter_3m' || planId.toLowerCase().includes('3') || planId.toLowerCase().includes('starter')) {
    return 90;
  }
  if (planId === 'starter_1m' || planId === '1_month' || planId.toLowerCase().includes('1m') || planId.toLowerCase().includes('month')) {
    return 30;
  }
  return 30;
};

/**
 * Returns formatted human-readable plan name
 */
export const getPlanDisplayName = (planId?: string): string => {
  if (!planId || planId === 'free_trial' || planId === 'trial') return 'Free Trial (30 Days)';
  if (planId === 'enterprise_12m' || planId.toLowerCase().includes('12') || planId.toLowerCase().includes('enterprise')) {
    return 'Enterprise Plan (12 Months)';
  }
  if (planId === 'pro_6m' || planId.toLowerCase().includes('6') || planId.toLowerCase().includes('pro')) {
    return 'Pro Plan (6 Months)';
  }
  if (planId === 'starter_3m' || planId.toLowerCase().includes('3') || planId.toLowerCase().includes('starter')) {
    return 'Starter Plan (3 Months)';
  }
  if (planId === 'starter_1m' || planId === '1_month' || planId.toLowerCase().includes('1m') || planId.toLowerCase().includes('month')) {
    return '1-Month Plan';
  }
  return planId.replace(/_/g, ' ').toUpperCase();
};

/**
 * Dynamically calculates the subscription expiry date starting from today (or specified fromDate)
 * Returns date formatted as YYYY-MM-DD
 */
export const calculateSubscriptionExpiry = (
  planId?: string,
  fromDate: Date = new Date()
): { expiryDate: string; durationDays: number } => {
  const durationDays = getPlanDurationInDays(planId);
  const expiryDateObj = new Date(fromDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const expiryDate = expiryDateObj.toISOString().split('T')[0];
  return {
    expiryDate,
    durationDays
  };
};

/**
 * Calculates remaining days from an expiry date string (YYYY-MM-DD or ISO string)
 * Implements Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
 */
export const calculateRemainingDays = (expiryDateStr?: string): number => {
  if (!expiryDateStr) return 0;
  // If date-only string, append time to ensure end-of-day or UTC matching
  const dateObj = expiryDateStr.includes('T') 
    ? new Date(expiryDateStr) 
    : new Date(`${expiryDateStr}T23:59:59Z`);
  const expiryTime = dateObj.getTime();
  if (isNaN(expiryTime)) {
    // Fallback to standard parse
    const fallbackTime = new Date(expiryDateStr).getTime();
    if (isNaN(fallbackTime)) return 0;
    return Math.max(0, Math.ceil((fallbackTime - Date.now()) / (1000 * 60 * 60 * 24)));
  }
  const now = Date.now();
  if (expiryTime <= now) return 0;
  return Math.max(0, Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24)));
};

/**
 * Checks if merchant has an active paid subscription
 */
export const isPaidSubscriptionActive = (merchant?: { subscriptionPlan?: SubscriptionPlanId; subscriptionExpiry?: string } | null): boolean => {
  if (!merchant || !merchant.subscriptionPlan) return false;
  if (merchant.subscriptionPlan === 'free_trial' || merchant.subscriptionPlan === 'trial') return false;
  if (!merchant.subscriptionExpiry) return true; // plan assigned without explicit expiry is considered active
  return calculateRemainingDays(merchant.subscriptionExpiry) > 0;
};
