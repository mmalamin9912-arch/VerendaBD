import { SubscriptionPlanId } from '../types';

/**
 * Maps plan ID to its exact duration in days:
 * - Free Trial / 1 Month: 30 days
 * - Starter Plan / 3 Months: 90 days
 * - Pro Plan / 6 Months: 180 days
 * - Enterprise Plan / 12 Months: 365 days
 */
export const getPlanDurationInDays = (planId?: string): number => {
  if (!planId) return 30;
  const lower = planId.toLowerCase().trim();
  
  if (
    lower.includes('12m') ||
    lower.includes('12_months') ||
    lower.includes('enterprise') ||
    lower.includes('annual') ||
    lower.includes('12_month') ||
    lower.includes('year')
  ) {
    return 365;
  }
  if (
    lower.includes('6m') ||
    lower.includes('6_months') ||
    lower.includes('pro') ||
    lower.includes('6_month') ||
    lower.includes('half_year')
  ) {
    return 180;
  }
  if (
    lower.includes('3m') ||
    lower.includes('3_months') ||
    lower.includes('starter_3m') ||
    lower.includes('starter') ||
    lower.includes('3_month')
  ) {
    return 90;
  }
  if (
    lower.includes('1m') ||
    lower.includes('1_month') ||
    lower.includes('starter_1m') ||
    lower.includes('free_trial') ||
    lower.includes('trial') ||
    lower.includes('month')
  ) {
    return 30;
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
 * Generates absolute ISO timestamps for plan start and expiration
 * Requirement 1: plan_started_at (Timestamp) and expires_at (Timestamp = plan_started_at + duration)
 */
export const calculatePlanTimestamps = (
  planId?: string,
  startDate: Date = new Date()
): {
  plan_started_at: string;
  expires_at: string;
  expiryDate: string;
  durationDays: number;
  durationMs: number;
} => {
  const durationDays = getPlanDurationInDays(planId);
  const durationMs = durationDays * 24 * 60 * 60 * 1000;
  const startMs = startDate.getTime();
  const expiryMs = startMs + durationMs;
  const plan_started_at = new Date(startMs).toISOString();
  const expires_at = new Date(expiryMs).toISOString();
  const expiryDate = expires_at.split('T')[0];

  return {
    plan_started_at,
    expires_at,
    expiryDate,
    durationDays,
    durationMs
  };
};

/**
 * Dynamically calculates the subscription expiry date starting from today (or specified fromDate)
 * Returns date formatted as YYYY-MM-DD
 */
export const calculateSubscriptionExpiry = (
  planId?: string,
  fromDate: Date = new Date()
): { expiryDate: string; durationDays: number; plan_started_at: string; expires_at: string } => {
  const { expiryDate, durationDays, plan_started_at, expires_at } = calculatePlanTimestamps(planId, fromDate);
  return {
    expiryDate,
    durationDays,
    plan_started_at,
    expires_at
  };
};

/**
 * Offline Continuous Calculation:
 * Calculates remaining time dynamically using: Remaining Time = expires_at - Date.now()
 * Ensures countdown continues in background/offline mode seamlessly.
 */
export const calculateRemainingTimeFromExpiry = (expiresAtStr?: string) => {
  if (!expiresAtStr) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, totalDaysFloat: 0, diffMs: 0 };
  }
  const expiryTime = new Date(expiresAtStr).getTime();
  if (isNaN(expiryTime)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, totalDaysFloat: 0, diffMs: 0 };
  }
  
  const nowMs = Date.now();
  const diffMs = Math.max(0, expiryTime - nowMs);
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalDaysFloat = diffMs / (1000 * 60 * 60 * 24);

  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalSeconds, totalDaysFloat, diffMs };
};

/**
 * Calculates remaining days dynamically from an expiry date string (YYYY-MM-DD or ISO string)
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
export const isPaidSubscriptionActive = (merchant?: { subscriptionPlan?: SubscriptionPlanId; subscriptionExpiry?: string; expires_at?: string } | null): boolean => {
  if (!merchant || !merchant.subscriptionPlan) return false;
  if (merchant.subscriptionPlan === 'free_trial' || merchant.subscriptionPlan === 'trial') return false;
  const expiry = merchant.expires_at || merchant.subscriptionExpiry;
  if (!expiry) return true; // plan assigned without explicit expiry is considered active
  return calculateRemainingDays(expiry) > 0;
};


