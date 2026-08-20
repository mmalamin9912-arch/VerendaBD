import { SubscriptionPlanId } from '../types';

/**
 * Maps plan ID to its exact duration in days:
 * - Enterprise / 12 Months: 365 days
 * - Pro / 6 Months: 180 days
 * - Starter / 3 Months: 90 days
 * - Default / Fallback: 30 days
 */
export const getPlanDurationInDays = (planId?: string): number => {
  if (!planId) return 30;
  const lower = planId.toLowerCase();
  
  if (lower.includes('12m') || lower.includes('enterprise')) {
    return 365;
  }
  if (lower.includes('6m') || lower.includes('pro')) {
    return 180;
  }
  if (lower.includes('3m') || lower.includes('starter')) {
    return 90;
  }
  return 30;
};

/**
 * Returns formatted human-readable plan name
 */
export const getPlanDisplayName = (planId?: string): string => {
  if (!planId || planId === 'free_trial' || planId === 'trial') return 'Free Trial (30 Days)';
  const lower = planId.toLowerCase();
  if (lower.includes('12m') || lower.includes('enterprise')) {
    return 'Enterprise Plan (12 Months)';
  }
  if (lower.includes('6m') || lower.includes('pro')) {
    return 'Pro Plan (6 Months)';
  }
  if (lower.includes('3m') || lower.includes('starter')) {
    return 'Starter Plan (3 Months)';
  }
  if (lower.includes('1m') || lower.includes('month') || lower === 'starter_1m') {
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
  const expiryDate = new Date(fromDate.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return {
    expiryDate,
    durationDays
  };
};

/**
 * Calculates remaining days dynamically from an expiry date string (YYYY-MM-DD or ISO string)
 * Implements Math.max(0, Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
 */
export const calculateRemainingDays = (expiryDateStr?: string): number => {
  if (!expiryDateStr) return 0;
  const expiryTime = new Date(expiryDateStr).getTime();
  if (isNaN(expiryTime)) return 0;
  return Math.max(0, Math.ceil((expiryTime - Date.now()) / (1000 * 60 * 60 * 24)));
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

