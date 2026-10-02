import { api } from '@/src/api';
import { router as expoRouter } from 'expo-router';

const DEMO_CHECKOUT = true;
/**
 * SubscriptionContext.tsx
 * Global subscription state for Hera — powered by native Apple IAP (StoreKit).
 * All purchases go through Apple In-App Purchases (com.hera.app.premium.monthly / .yearly).
 * Stripe has been fully removed. Subscription management is via App Store Settings.
 */
import React, {
  createContext, useState, useCallback, useEffect, useRef, ReactNode,
} from 'react';
import AsyncStorage from '@/src/utils/async-storage';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import {
  connectIAP,
  disconnectIAP,
  fetchIAPProducts,
  purchaseSubscription,
  restorePurchases,
  validateReceiptWithServer,
  loadCachedIAPStatus,
  clearCachedIAPStatus,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  IAP_SKUS,
  mapProductToKey,
  type IAPSubscription,
  type SubscriptionPurchase,
  type PurchaseError,
  type IAPStatus,
} from '@/services/iapService';
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

  const [isLoading,       setIsLoading]      = useState(false);
  const [isPurchasing,    setIsPurchasing]    = useState(false);
  const [isSubscribed,    setIsSubscribed]    = useState(false);
  const [isTrial,         setIsTrial]         = useState(false);
  const [plan,            setPlan]            = useState<Plan>('free');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [dailyChatCount,  setDailyChatCount]  = useState(0);
  const [paywallVisible,  setPaywallVisible]  = useState(false);
  const [paywallFeature,  setPaywallFeature]  = useState('AI Feature');
  const [iapProducts,     setIapProducts]     = useState<IAPSubscription[]>([]);
  const [iapReady,        setIapReady]        = useState(false);
  const safetyTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevents safety timer from showing "timed out" if the purchase listener already handled it
  const purchaseHandledRef = useRef(false);

  const authUserId = authUser?.id;

  // ── Apply IAP status to context state ──────────────────────────────────────
  const applyIAPStatus = useCallback((status: IAPStatus) => {
    setIsSubscribed(status.isSubscribed);
    setIsTrial(status.isTrial);
    setPlan(status.plan);
    setSubscriptionEnd(status.expiresAt);
  }, []);

  // ── Initialize IAP connection ───────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    let mounted = true;
    connectIAP().then(async (ok) => {
      if (!mounted) return;
      if (!ok) {
        console.warn('[IAP] connectIAP returned false — store unavailable on this platform');
        return;
      }
      setIapReady(true);

      // Load cached status immediately so UI is correct while we re-validate
      const cached = await loadCachedIAPStatus();
      if (mounted) applyIAPStatus(cached);

      // Fetch product metadata (titles, prices) from the store.
      // Retry once after 3 s if first fetch returns empty — common on first cold launch
      // or when the StoreKit product list hasn't propagated from App Store Connect yet.
      let products = await fetchIAPProducts();
      if (products.length === 0) {
        await new Promise(r => setTimeout(r, 3000));
        products = await fetchIAPProducts();
      }
      if (mounted) setIapProducts(products);
    });

    return () => {
      mounted = false;
      disconnectIAP();
    };
  }, [applyIAPStatus]);

  // ── Purchase & error listeners ──────────────────────────────────────────────
  // Attached immediately at mount (not gated on iapReady) so we never miss an event
  // delivered by StoreKit before the iapReady flag flips — especially important on iPad.
  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    const purchaseSub = purchaseUpdatedListener(async (purchase: SubscriptionPurchase) => {
      // Mark handled so safety timer doesn't fire after us
      purchaseHandledRef.current = true;
      if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }

      const receipt = Platform.OS === 'ios'
        ? ((purchase as any).transactionReceipt as string | undefined)
        : (purchase.purchaseToken as string | undefined);

      if (!receipt) {
        // StoreKit delivered a purchase event with no receipt — finish to unblock queue
        console.warn('[IAP] purchaseUpdatedListener: empty receipt — finishing transaction to unblock queue');
        await finishTransaction({ purchase, isConsumable: false }).catch(() => {});
        setIsPurchasing(false);
        return;
      }

      try {
        setIsPurchasing(true);
        const status = await validateReceiptWithServer(
          receipt,
          purchase.productId,
          Platform.OS === 'ios' ? 'ios' : 'android',
        );
        applyIAPStatus(status);

        // Always finish the transaction BEFORE navigating away so StoreKit doesn't re-deliver it.
        await finishTransaction({ purchase, isConsumable: false });

        if (status.isSubscribed) {
          showAlert(
            'Welcome to Hera Premium! \uD83C\uDF1F',
            status.isTrial
              ? 'Your 7-day free trial has started. Enjoy unlimited access!'
              : 'Subscription activated. Enjoy unlimited access!',
          );
          router.replace('/(tabs)');
        } else {
          showAlert(
            'Verification Pending',
            'Your purchase was received but subscription status is still pending. Please restore purchases in a moment.',
          );
        }
      } catch (e: any) {
        // Even on error, finish the transaction so StoreKit doesn't hang
        await finishTransaction({ purchase, isConsumable: false }).catch(() => {});
        showAlert('Purchase Error', e.message || 'Could not verify your purchase. Please restore purchases or contact support.');
      } finally {
        setIsPurchasing(false);
      }
    });

    const errorSub = purchaseErrorListener((error: PurchaseError) => {
      purchaseHandledRef.current = true;
      if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
      setIsPurchasing(false);

      const code = String((error as any).code ?? '');
      if (code !== 'E_USER_CANCELLED') {
        const isNotFound = code === 'E_ITEM_UNAVAILABLE' || code === 'E_PRODUCT_NOT_FOUND';
        showAlert(
          isNotFound ? 'Product Unavailable' : 'Purchase Failed',
          isNotFound
            ? 'This subscription is not available in the App Store yet. Please ensure the IAP products are approved in App Store Connect and try again.'
            : (error.message || 'The purchase could not be completed. Please try again.'),
        );
      }
    });

    return () => {
      purchaseSub.remove();
      errorSub.remove();
    };
  }, [applyIAPStatus, showAlert]);

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

  // ── Check subscription (re-validate with server) ────────────────────────────
  const checkSubscription = useCallback(async () => {
    // For iOS / Android: restore purchases from StoreKit and validate latest receipt
    if ((Platform.OS === 'ios' || Platform.OS === 'android') && iapReady) {
      setIsLoading(true);
      try {
        const available = await restorePurchases();
        if (available.length > 0) {
          const latest = available[available.length - 1];
          const receipt = Platform.OS === 'ios'
            ? (latest as any).transactionReceipt
            : latest.purchaseToken;
          if (receipt) {
            const status = await validateReceiptWithServer(receipt, latest.productId, Platform.OS === 'ios' ? 'ios' : 'android');
            applyIAPStatus(status);
            return;
          }
        }
        // No active IAP receipt — fall back to server check (covers test-email allowlist)
        if (authUserId) {
          try {
            const { getSupabaseClient } = await import('@/template');
            const supabase = getSupabaseClient();
            const { data } = await supabase.functions.invoke('check-subscription');
            if (data?.subscribed) {
              applyIAPStatus({
                isSubscribed: true,
                isTrial: data.is_trial ?? false,
                plan: data.plan === 'annual' || data.plan === 'yearly' ? 'yearly' : 'monthly',
                expiresAt: data.subscription_end ?? null,
                validatedAt: new Date().toISOString(),
              });
              return;
            }
          } catch {}
        }
        applyIAPStatus({ isSubscribed: false, isTrial: false, plan: 'free', expiresAt: null, validatedAt: new Date().toISOString() });
      } catch {
        // Silent — keep cached state
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Fallback for test accounts / non-mobile: check via check-subscription edge function
    if (!authUserId) {
      applyIAPStatus({ isSubscribed: false, isTrial: false, plan: 'free', expiresAt: null, validatedAt: new Date().toISOString() });
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
        setPlan(data.plan === 'annual' || data.plan === 'yearly' ? 'yearly' : 'monthly');
        setSubscriptionEnd(data.subscription_end ?? null);
      }
    } catch {}
    finally { setIsLoading(false); }
  }, [iapReady, authUserId, applyIAPStatus]);

  // Auto-check on IAP ready or auth change
  useEffect(() => {
    if (!iapReady && Platform.OS !== 'web') return;
    checkSubscription();
  }, [iapReady, authUserId, checkSubscription]);

  // ── Purchase a plan (native StoreKit only) ──────────────────────────────────
  const purchasePlan = useCallback(async (productKey: 'monthly' | 'yearly') => {
    // Emergent preview: no App Store / Play Store products are connected yet, so the
    // free trial is activated through the backend (demo — no payment is taken).
    if (DEMO_CHECKOUT) {
      try {
        setIsPurchasing(true);
        await api('/premium/activate', { method: 'POST' });
        await checkSubscription();
        expoRouter.replace('/(tabs)');
      } catch {
        showAlert('Something went wrong', 'Please sign in first, then start your free trial.');
      } finally {
        setIsPurchasing(false);
      }
      return;
    }
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      showAlert(
        'Available on Device',
        'In-App Purchases are only available on the iOS or Android app. Please install Hera from the App Store to subscribe.',
      );
      return;
    }

    if (!iapReady) {
      showAlert('Store Unavailable', 'The App Store is not ready yet. Please wait a moment and try again.');
      return;
    }

    // Guard: warn if no products loaded from App Store Connect
    if (iapProducts.length === 0) {
      showAlert(
        'Store Not Ready',
        'Subscription products could not be loaded from the App Store. Please check your internet connection and try again. If the issue persists, ensure the IAP products are active in App Store Connect.',
      );
      return;
    }

    const sku = productKey === 'yearly' ? IAP_SKUS.yearly : IAP_SKUS.monthly;

    // Guard: warn if this specific SKU wasn't returned by the store
    const productExists = iapProducts.some(p => p.productId === sku);
    if (!productExists) {
      showAlert(
        'Product Not Found',
        `The ${productKey} subscription (${sku}) was not found in the App Store. Please verify the product ID is active and approved in App Store Connect.`,
      );
      return;
    }

    // Reset handled flag before new purchase attempt
    purchaseHandledRef.current = false;
    setIsPurchasing(true);

    // Safety timeout — fires only if StoreKit never delivers a listener event
    safetyTimerRef.current = setTimeout(() => {
      safetyTimerRef.current = null;
      if (!purchaseHandledRef.current) {
        setIsPurchasing(false);
        showAlert(
          'Purchase Timed Out',
          'The App Store did not respond. Please verify your In-App Purchase products are active in App Store Connect and that your Paid Apps Agreement is signed, then try again.',
        );
      }
    }, 60_000);

    try {
      await purchaseSubscription(sku, authUserId);
      // Completion arrives asynchronously via purchaseUpdatedListener.
    } catch (e: any) {
      if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
      setIsPurchasing(false);
      const code = String((e as any).code ?? '');
      if (code !== 'E_USER_CANCELLED') {
        showAlert('Purchase Error', e.message || 'Could not start purchase. Please try again.');
      }
    }
  }, [iapReady, iapProducts, authUserId, showAlert]);

  // ── Restore purchases ───────────────────────────────────────────────────────
  const restoreSubscription = useCallback(async () => {
    setIsLoading(true);
    let restored = false;
    try {
      // On iOS/Android: try to restore via StoreKit directly
      if ((Platform.OS === 'ios' || Platform.OS === 'android') && iapReady) {
        const available = await restorePurchases();
        if (available.length > 0) {
          const latest = available[available.length - 1];
          const receipt = Platform.OS === 'ios'
            ? (latest as any).transactionReceipt
            : latest.purchaseToken;
          if (receipt) {
            const status = await validateReceiptWithServer(receipt, latest.productId, Platform.OS === 'ios' ? 'ios' : 'android');
            applyIAPStatus(status);
            restored = status.isSubscribed;
          }
        }
      } else if (authUserId) {
        // Fallback: server check (covers test-email allowlist on web/simulator)
        const { getSupabaseClient } = await import('@/template');
        const supabase = getSupabaseClient();
        const { data } = await supabase.functions.invoke('check-subscription');
        if (data?.subscribed) {
          applyIAPStatus({
            isSubscribed: true,
            isTrial: data.is_trial ?? false,
            plan: data.plan === 'annual' || data.plan === 'yearly' ? 'yearly' : 'monthly',
            expiresAt: data.subscription_end ?? null,
            validatedAt: new Date().toISOString(),
          });
          restored = true;
        }
      }

      if (restored) {
        showAlert('Subscription Restored', 'Your Hera Premium subscription has been restored!');
        router.replace('/(tabs)');
      } else {
        showAlert('No Active Subscription', 'No active subscription was found for your Apple ID.');
      }
    } catch (e: any) {
      showAlert('Restore Failed', e.message || 'Could not restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [iapReady, authUserId, applyIAPStatus, showAlert]);

  // ── Manage subscription via App Store Settings ──────────────────────────────
  const openPortal = useCallback(async () => {
    try {
      const { Linking } = await import('react-native');
      await Linking.openURL('https://apps.apple.com/account/subscriptions');
    } catch {
      showAlert('Unable to Open', 'Please go to Settings > Apple ID > Subscriptions to manage your Hera subscription.');
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
      isPurchasing,
      isSubscribed,
      isTrial,
      plan,
      planLabel: PLAN_LABELS[plan],
      subscriptionEnd,
      dailyChatCount,
      canSendChat,
      iapProducts,
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
