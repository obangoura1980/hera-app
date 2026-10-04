/**
 * SubscriptionContext.tsx
 * Global subscription state for Hera — backed by RevenueCat (App Store / Play
 * Store billing; Test Store in Expo Go / web preview).
 * Source of truth: customerInfo.entitlements.active['pro'] via src/lib/revenuecat.
 * A server-side owner allowlist (GET /api/subscription) is honored on top so the
 * app owner account stays premium without a store purchase.
 */
import React, {
  createContext, useState, useCallback, useEffect, useRef, ReactNode,
} from 'react';
import { Platform, Linking } from 'react-native';
import { router } from 'expo-router';
import Purchases from 'react-native-purchases';
import AsyncStorage from '@/src/utils/async-storage';
import { useAuth, useAlert } from '@/template';
import { api } from '@/src/api';
import { useRCSubscription, rcEnabled, rcLogIn, rcLogOut, REVENUECAT_ENTITLEMENT_IDENTIFIER } from '@/src/lib/revenuecat';
import { PaywallModal } from '@/components/feature/PaywallModal';
import type { IAPSubscription } from '@/services/iapService';

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
  // State
  isLoading:      boolean;
  isPurchasing:   boolean;
  isSubscribed:   boolean;
  isTrial:        boolean;
  plan:           Plan;
  planLabel:      string;
  subscriptionEnd: string | null;
  dailyChatCount: number;
  canSendChat:    boolean;
  iapProducts:    IAPSubscription[];
  statusLoaded:   boolean;
  // Actions
  checkSubscription:  () => Promise<void>;
  purchasePlan:       (productKey: 'monthly' | 'yearly') => Promise<void>;
  restoreSubscription: () => Promise<void>;
  incrementChatCount: () => void;
  showPaywall:        (feature?: string) => void;
  hidePaywall:        () => void;
  // App Store subscription management
  openPortal: () => Promise<void>;
}

export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const { showAlert } = useAlert();
  const rc = useRCSubscription();

  const [isLoading,       setIsLoading]       = useState(false);
  const [serverBypass,    setServerBypass]    = useState(false); // owner allowlist
  const [serverPlan,      setServerPlan]      = useState<Plan>('yearly');
  const [bypassChecked,   setBypassChecked]   = useState(false);
  const [dailyChatCount,  setDailyChatCount]  = useState(0);
  const [paywallVisible,  setPaywallVisible]  = useState(false);
  const [paywallFeature,  setPaywallFeature]  = useState('AI Feature');
  const [purchaseIdentityError, setPurchaseIdentityError] = useState<string | null>(null);
  const rcIdentityRef = useRef<string | null>(null);

  const authUserId = authUser?.id;

  // ── RevenueCat identity — COMPULSORY before any purchase ───────────────────
  useEffect(() => {
    if (!rcEnabled) return;
    (async () => {
      try {
        if (authUserId && rcIdentityRef.current !== authUserId) {
          const { customerInfo } = await rcLogIn(authUserId);
          rcIdentityRef.current = authUserId;
          setPurchaseIdentityError(null);
          console.log('[RevenueCat] identity bound:', customerInfo.originalAppUserId);
        } else if (!authUserId && rcIdentityRef.current) {
          await rcLogOut();
          rcIdentityRef.current = null;
        }
      } catch (e) {
        // NEVER swallow — an anonymous purchase cannot be mapped to the user.
        setPurchaseIdentityError(String(e));
      }
    })();
  }, [authUserId]);

  // ── Owner allowlist (backend whitelist — not a purchase path) ───────────────
  const checkServerBypass = useCallback(async (): Promise<boolean> => {
    if (!authUserId) { setServerBypass(false); setBypassChecked(true); return false; }
    try {
      const data: any = await api('/subscription');
      const ok = !!data?.subscribed;
      setServerBypass(ok);
      if (ok) setServerPlan(data.plan === 'monthly' ? 'monthly' : 'yearly');
      return ok;
    } catch {
      return false;
    } finally {
      setBypassChecked(true);
    }
  }, [authUserId]);

  useEffect(() => { checkServerBypass(); }, [checkServerBypass]);

  // ── Derived entitlement state ───────────────────────────────────────────────
  const entitlement = rc.customerInfo?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER];
  const rcSubscribed = !!entitlement;
  const isSubscribed = rcSubscribed || serverBypass;
  const isTrial = entitlement?.periodType === 'trial';
  const subscriptionEnd = entitlement?.expirationDate ?? null;

  const packages = rc.offerings?.current?.availablePackages ?? [];
  const plan: Plan = (() => {
    if (!isSubscribed) return 'free';
    const match = packages.find(p => p.product.identifier === entitlement?.productIdentifier);
    if (match?.packageType === 'ANNUAL') return 'yearly';
    if (match?.packageType === 'MONTHLY') return 'monthly';
    return serverBypass && !rcSubscribed ? serverPlan : 'monthly';
  })();

  // Offerings → legacy product shape consumed by the paywall UI
  // (productId carries the RC package identifier, matched via IAP_SKUS)
  const iapProducts: IAPSubscription[] = packages.map(pkg => ({
    productId: pkg.identifier,
    title: pkg.product.title,
    description: pkg.product.description,
    localizedPrice: pkg.product.priceString,
    currency: pkg.product.currencyCode,
  }));

  const statusLoaded = bypassChecked && !rc.isLoading;

  // ── Load persisted daily chat count ────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(DAILY_CHAT_KEY).then(val => {
      if (!val) return;
      try {
        const parsed = JSON.parse(val);
        if (parsed.date === new Date().toDateString()) {
          setDailyChatCount(parsed.count ?? 0);
        }
      } catch {}
    });
  }, []);

  // ── Re-check (pull-to-refresh / app-foreground) ─────────────────────────────
  const checkSubscription = useCallback(async () => {
    await Promise.allSettled([rc.refetchCustomerInfo(), checkServerBypass()]);
  }, [rc, checkServerBypass]);

  // ── Purchase a plan ─────────────────────────────────────────────────────────
  const purchasePlan = useCallback(async (productKey: 'monthly' | 'yearly') => {
    const identifier = productKey === 'yearly' ? '$rc_annual' : '$rc_monthly';
    const pkg = (rc.offerings?.current?.availablePackages ?? []).find(p => p.identifier === identifier);
    if (!pkg) {
      showAlert('Unavailable', 'Subscription options are unavailable right now. Please try again later.');
      return;
    }
    if (!rc.identityReady) {
      showAlert('Almost Ready', purchaseIdentityError
        ? 'We could not prepare secure checkout. Please check your connection and try again.'
        : 'Preparing secure checkout — please try again in a moment.');
      return;
    }
    try {
      const customerInfo = await rc.purchase(pkg);
      const active = !!customerInfo?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER];
      if (!active) return; // listener will update state; no nav until entitlement is live
      showAlert(
        'Welcome to Hera Premium! 🌟',
        customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_IDENTIFIER]?.periodType === 'trial'
          ? 'Your 7-day free trial has started. Enjoy unlimited access!'
          : 'Subscription activated. Enjoy unlimited access!',
      );
      // Drop onboarding/sign-in from the back stack so Home is the root
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e?.userCancelled) return; // user dismissed the sheet — stay silent
      if (e?.message === 'identity_not_ready') {
        showAlert('Almost Ready', 'Preparing secure checkout — please try again in a moment.');
        return;
      }
      showAlert('Purchase Error', e?.message || 'The purchase could not be completed. Please try again.');
    }
  }, [rc, showAlert, purchaseIdentityError]);

  // ── Restore purchases (Apple requires this entry point) ─────────────────────
  const restoreSubscription = useCallback(async () => {
    setIsLoading(true);
    try {
      let active = false;
      if (rcEnabled) {
        const info = await rc.restore();
        active = !!info?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER];
      }
      const bypass = await checkServerBypass();
      if (active || bypass) {
        showAlert('Subscription Restored', 'Your Hera Premium subscription has been restored!');
        if (router.canDismiss()) router.dismissAll();
        router.replace('/(tabs)');
      } else {
        showAlert('No Active Subscription', 'No active subscription was found for this account.');
      }
    } catch (e: any) {
      showAlert('Restore Failed', e?.message || 'Could not restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [rc, checkServerBypass, showAlert]);

  // ── Manage subscription via store settings ──────────────────────────────────
  const openPortal = useCallback(async () => {
    try {
      await Linking.openURL(Platform.OS === 'android'
        ? 'https://play.google.com/store/account/subscriptions'
        : 'https://apps.apple.com/account/subscriptions');
    } catch {
      showAlert('Unable to Open', 'Please manage your Hera subscription in your App Store / Play Store account settings.');
    }
  }, [showAlert]);

  // ── Chat limit helpers ──────────────────────────────────────────────────────
  const incrementChatCount = useCallback(() => {
    setDailyChatCount(prev => {
      const next = prev + 1;
      AsyncStorage.setItem(DAILY_CHAT_KEY, JSON.stringify({
        date: new Date().toDateString(),
        count: next,
      })).catch(() => {});
      return next;
    });
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
      isPurchasing: rc.isPurchasing,
      isSubscribed,
      isTrial,
      plan,
      planLabel: PLAN_LABELS[plan],
      subscriptionEnd,
      dailyChatCount,
      canSendChat,
      iapProducts,
      statusLoaded,
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
