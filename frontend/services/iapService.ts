/**
 * iapService.ts — Cross-platform stub (no react-native-iap).
 * Used on every platform while DEMO_CHECKOUT routes the free trial through the
 * backend (POST /api/premium/activate). All exports mirror the future native
 * implementation so consumers compile unchanged.
 */
import AsyncStorage from '@/src/utils/async-storage';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@/template/core/supabase-types';

// ── Product IDs ───────────────────────────────────────────────────────────────

export const IAP_SKUS = {
  monthly: 'com.hera.app.premium.monthly',
  yearly:  'com.hera.app.premium.yearly',
} as const;

export type IAPProductKey = keyof typeof IAP_SKUS;

const IAP_STATUS_KEY = '@hera_iap_status';

// ── Types (mirrored from native) ──────────────────────────────────────────────

export interface IAPStatus {
  isSubscribed: boolean;
  isTrial:      boolean;
  plan:         'free' | 'monthly' | 'yearly';
  expiresAt:    string | null;
  validatedAt:  string;
}

export interface IAPSubscription {
  productId:       string;
  title?:          string;
  description?:    string;
  localizedPrice?: string;
  currency?:       string;
}

export interface SubscriptionPurchase {
  productId:        string;
  transactionId?:   string;
  transactionDate?: string;
  purchaseToken?:   string;
}

export interface PurchaseError {
  code:    string;
  message: string;
}

// ── No-op stubs (web — never reach the store) ─────────────────────────────────

export async function connectIAP(): Promise<boolean> { return false; }

export async function disconnectIAP(): Promise<void> {}

export async function fetchIAPProducts(): Promise<IAPSubscription[]> { return []; }

export async function purchaseSubscription(
  _sku: string,
  _applicationUsername?: string,
): Promise<void> {
  throw new Error('In-App Purchases are only available on iOS and Android.');
}

export async function restorePurchases(): Promise<SubscriptionPurchase[]> { return []; }

// ── Server-side receipt validation (web uses edge function directly) ───────────

export async function validateReceiptWithServer(
  receiptOrToken: string,
  productId: string,
  platform: 'ios' | 'android' = 'ios',
): Promise<IAPStatus> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('validate-iap', {
      body: { receipt: receiptOrToken, productId, platform },
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { msg = await error.context?.text() || msg; } catch {}
      }
      throw new Error(msg);
    }

    const status: IAPStatus = {
      isSubscribed: data.subscribed ?? false,
      isTrial:      data.is_trial  ?? false,
      plan:         mapProductToKey(productId),
      expiresAt:    data.expires_at ?? null,
      validatedAt:  new Date().toISOString(),
    };

    await AsyncStorage.setItem(IAP_STATUS_KEY, JSON.stringify(status));
    return status;
  } catch {
    return loadCachedIAPStatus();
  }
}

export async function loadCachedIAPStatus(): Promise<IAPStatus> {
  const FREE: IAPStatus = {
    isSubscribed: false,
    isTrial:      false,
    plan:         'free',
    expiresAt:    null,
    validatedAt:  new Date().toISOString(),
  };
  try {
    const raw = await AsyncStorage.getItem(IAP_STATUS_KEY);
    if (!raw) return FREE;
    return JSON.parse(raw) as IAPStatus;
  } catch {
    return FREE;
  }
}

export async function clearCachedIAPStatus(): Promise<void> {
  await AsyncStorage.removeItem(IAP_STATUS_KEY);
}

export function mapProductToKey(productId: string): 'monthly' | 'yearly' | 'free' {
  if (productId === IAP_SKUS.monthly) return 'monthly';
  if (productId === IAP_SKUS.yearly)  return 'yearly';
  return 'free';
}

// ── Stub listener helpers (web — never fire) ──────────────────────────────────

export function purchaseUpdatedListener(
  _callback: (purchase: SubscriptionPurchase) => void | Promise<void>,
): { remove: () => void } {
  return { remove: () => {} };
}

export function purchaseErrorListener(
  _callback: (error: PurchaseError) => void,
): { remove: () => void } {
  return { remove: () => {} };
}

export async function finishTransaction(
  _opts: { purchase: SubscriptionPurchase; isConsumable: boolean },
): Promise<void> {}
