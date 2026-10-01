/**
 * SubscriptionContext.web.tsx
 * Web-safe subscription context — no react-native-iap imports.
 * Metro picks this file on web; SubscriptionContext.tsx is used on native.
 * IAP purchase/restore are no-ops on web (users must subscribe on device).
 */
import React, {
  createContext, useState, useCallback, useEffect, ReactNode,
} from 'react';
import { router } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { PaywallModal } from '@/components/feature/PaywallModal';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAILY_CHAT_KEY = '@hera_daily_chat';
export const FREE_CHAT_LIMIT = 5;

// ── Types ─────────────────────────────────────────────────────────────────────

export type Plan = 'free' | 'monthly' | 'yearly';

const PLAN_LABELS: Record<Plan, string> = {
  free:    'Free',
  monthly: 'Monthly',
  yearly:  'Annual',
};

interface SubscriptionContextType {
  isLoading:       boolean;
  isPurchasing:    boolean;
  isSubscribed:    boolean;
  isTrial:         boolean;
  plan:            Plan;
  planLabel:       string;
  subscriptionEnd: string | null;
  dailyChatCount:  number;
  canSendChat:     boolean;
  iapProducts:     any[];
  checkSubscription:   () => Promise<void>;
  purchasePlan:        (productKey: 'monthly' | 'yearly') => Promise<void>;
  restoreSubscription: () => Promise<void>;
  incrementChatCount:  () => void;
  showPaywall:         (feature?: string) => void;
  hidePaywall:         () => void;
  openPortal:          () => Promise<void>;
}

export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const { showAlert } = useAlert();

  const [isLoading,       setIsLoading]      = useState(false);
  const [isSubscribed,    setIsSubscribed]    = useState(false);
  const [isTrial,         setIsTrial]         = useState(false);
  const [plan,            setPlan]            = useState<Plan>('free');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [dailyChatCount,  setDailyChatCount]  = useState(0);
  const [paywallVisible,  setPaywallVisible]  = useState(false);
  const [paywallFeature,  setPaywallFeature]  = useState('AI Feature');

  const authUserId = authUser?.id;

  // ── Check subscription via edge function ───────────────────────────────────
  const checkSubscription = useCallback(async () => {
    if (!authUserId) {
      setIsSubscribed(false);
      setIsTrial(false);
      setPlan('free');
      return;
    }
    setIsLoading(true);
    try {
      const { getSupabaseClient } = await import('@/template');
      const supabase = getSupabaseClient();
      const { data } = await supabase.functions.invoke('check-subscription');
      if (data?.subscribed) {
        setIsSubscribed(true);
        setIsTrial(data.is_trial ?? false);
        setPlan(data.plan === 'annual' ? 'yearly' : 'monthly');
        setSubscriptionEnd(data.subscription_end ?? null);
      } else {
        setIsSubscribed(false);
        setIsTrial(false);
        setPlan('free');
      }
    } catch {
      // Silent — keep cached state
    } finally {
      setIsLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    checkSubscription();
  }, [authUserId, checkSubscription]);

  // ── No-op IAP stubs (web users must subscribe on device) ──────────────────
  const purchasePlan = useCallback(async (_productKey: 'monthly' | 'yearly') => {
    showAlert(
      'Available on Device',
      'Subscriptions are managed through the iOS or Android app. Please install Hera from the App Store to subscribe.',
    );
  }, [showAlert]);

  const restoreSubscription = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!authUserId) {
        showAlert('Sign In Required', 'Please sign in to restore your subscription.');
        return;
      }
      const { getSupabaseClient } = await import('@/template');
      const supabase = getSupabaseClient();
      const { data } = await supabase.functions.invoke('check-subscription');
      if (data?.subscribed) {
        setIsSubscribed(true);
        setIsTrial(data.is_trial ?? false);
        setPlan(data.plan === 'annual' ? 'yearly' : 'monthly');
        setSubscriptionEnd(data.subscription_end ?? null);
        showAlert('Subscription Restored', 'Your Hera Premium subscription has been restored!');
        router.replace('/(tabs)');
      } else {
        showAlert('No Active Subscription', 'No active subscription was found for your account.');
      }
    } catch (e: any) {
      showAlert('Restore Failed', e.message || 'Could not restore subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [authUserId, showAlert]);

  const openPortal = useCallback(async () => {
    showAlert('Manage Subscription', 'Please go to Settings > Apple ID > Subscriptions to manage your Hera subscription.');
  }, [showAlert]);

  // ── Chat helpers ───────────────────────────────────────────────────────────
  const incrementChatCount = useCallback(() => {
    setDailyChatCount(prev => prev + 1);
  }, []);

  const showPaywall = useCallback((feature = 'Premium Feature') => {
    setPaywallFeature(feature);
    setPaywallVisible(true);
  }, []);

  const hidePaywall = useCallback(() => setPaywallVisible(false), []);

  const canSendChat = isSubscribed || dailyChatCount < FREE_CHAT_LIMIT;

  return (
    <SubscriptionContext.Provider value={{
      isLoading,
      isPurchasing: false,
      isSubscribed,
      isTrial,
      plan,
      planLabel: PLAN_LABELS[plan],
      subscriptionEnd,
      dailyChatCount,
      canSendChat,
      iapProducts: [],
      checkSubscription,
      purchasePlan,
      restoreSubscription,
      incrementChatCount,
      showPaywall,
      hidePaywall,
      openPortal,
    }}>
      {children}
      <PaywallModal
        visible={paywallVisible}
        feature={paywallFeature}
        chatCount={dailyChatCount}
        chatLimit={FREE_CHAT_LIMIT}
        onClose={hidePaywall}
        onCheckout={() => { hidePaywall(); router.push('/subscription'); }}
        onViewPlans={() => { hidePaywall(); router.push('/subscription'); }}
      />
    </SubscriptionContext.Provider>
  );
}
