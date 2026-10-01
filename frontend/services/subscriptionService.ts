/**
 * subscriptionService.ts
 * Subscription helpers for Hera — Native Apple IAP (StoreKit) only.
 * Stripe checkout and customer portal have been removed.
 */
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@/template/core/supabase-types';
import { Linking } from 'react-native';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Plan = 'free' | 'monthly' | 'yearly';

export interface SubscriptionData {
  subscribed:      boolean;
  plan:            Plan;
  subscriptionEnd: string | null;
  trialEnd:        string | null;
  isTrial:         boolean;
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function invokeFunction(name: string, body?: object): Promise<any> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try { msg = (await error.context?.text()) || msg; } catch {}
    }
    throw new Error(msg);
  }
  return data;
}

// ── API ───────────────────────────────────────────────────────────────────────

/**
 * Check subscription status via the check-subscription edge function.
 * Used as a server-side fallback and for test-email allowlist bypass.
 */
export async function fetchSubscriptionStatus(): Promise<SubscriptionData> {
  try {
    const data = await invokeFunction('check-subscription');
    return {
      subscribed:      data.subscribed     ?? false,
      plan:            (data.plan === 'annual' ? 'yearly' : data.plan === 'premium' ? 'monthly' : 'free') as Plan,
      subscriptionEnd: data.subscription_end ?? null,
      trialEnd:        data.trial_end       ?? null,
      isTrial:         data.is_trial        ?? false,
    };
  } catch {
    return { subscribed: false, plan: 'free', subscriptionEnd: null, trialEnd: null, isTrial: false };
  }
}

/**
 * Open Apple's subscription management page so users can cancel or change plans.
 * This replaces the Stripe Customer Portal.
 */
export async function openManagePortal(): Promise<void> {
  await Linking.openURL('https://apps.apple.com/account/subscriptions');
}
