/**
 * revenuecat.tsx — RevenueCat client (offerings, purchases, restore, identity).
 * Gating source of truth: customerInfo.entitlements.active['pro'].
 * Expo Go / web preview run against the RevenueCat Test Store (simulated purchases).
 */
import React, { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const REVENUECAT_TEST_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY || "test_DVTXvbpqNHTxfpwfxYwOVtIgyNc";
const REVENUECAT_IOS_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || "appl_nRHvPjOiMewtpDZxFfXIoTHznjo";
const REVENUECAT_ANDROID_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || "goog_CNkLLDrwBXistuBcTZgizldcrwG";

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "pro"; // from setup: entitlement_lookup_key

export const rcEnabled = Platform.OS !== "web" || __DEV__; // web preview uses the Test Store

function getRevenueCatApiKey() {
  if (Platform.OS === "web") {
    if (!REVENUECAT_TEST_API_KEY) {
      console.warn("[RevenueCat] REVENUECAT_TEST_API_KEY is not defined");
    }
    return REVENUECAT_TEST_API_KEY || "";
  }
  if (Platform.OS === "ios") {
    if (!REVENUECAT_IOS_API_KEY) {
      console.warn("[RevenueCat] REVENUECAT_IOS_API_KEY is not defined");
    }
    return REVENUECAT_IOS_API_KEY || "";
  }
  if (Platform.OS === "android") {
    if (!REVENUECAT_ANDROID_API_KEY) {
      console.warn("[RevenueCat] REVENUECAT_ANDROID_API_KEY is not defined");
    }
    return REVENUECAT_ANDROID_API_KEY || "";
  }
  return REVENUECAT_TEST_API_KEY || "";
}

let isConfigured = false;

export function initializeRevenueCat() {
  if (isConfigured) return;
  if (!rcEnabled) return; // no store on production web
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    console.warn(`[RevenueCat] Skipped configure: no API key found for ${Platform.OS}`);
    return;
  }
  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    Purchases.configure({ apiKey });
    isConfigured = true;
  } catch (err) {
    console.warn("[RevenueCat] Configure error:", err);
  }
}

export async function ensureRevenueCat(): Promise<boolean> {
  if (isConfigured) return true;
  initializeRevenueCat();
  try {
    const configured = await Purchases.isConfigured();
    if (configured) isConfigured = true;
    return configured;
  } catch {
    return isConfigured;
  }
}

// RevenueCat identity — originalAppUserId stays "$RCAnonymousID:…" after the
// first anonymous merge even when logIn() succeeds (documented RC behavior), so
// identity readiness is tracked from the logIn() RESOLUTION, not CustomerInfo.
// The flag is exposed reactively via useSyncExternalStore so consumers re-render.
let currentAppUserId: string | null = null;
const identitySubs = new Set<() => void>();
const notifyIdentity = () => identitySubs.forEach(cb => cb());
export async function rcLogIn(userId: string) {
  await ensureRevenueCat();
  const res = await Purchases.logIn(userId);
  currentAppUserId = userId;
  notifyIdentity();
  return res;
}
export async function rcLogOut() {
  currentAppUserId = null;
  notifyIdentity();
  try {
    const ok = await ensureRevenueCat();
    if (ok) {
      await Purchases.logOut();
    }
  } catch (e) {
    console.warn("[RevenueCat] rcLogOut error:", e);
  }
}
export const getRCAppUserId = () => currentAppUserId;

function useSubscriptionContext() {
  const queryClient = useQueryClient();

  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: async () => {
      await ensureRevenueCat();
      return Purchases.getCustomerInfo();
    },
    enabled: rcEnabled,
    staleTime: 60 * 1000,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async () => {
      await ensureRevenueCat();
      return Purchases.getOfferings();
    },
    enabled: rcEnabled,
    staleTime: 300 * 1000,
  });

  // Reactive entitlement updates — the SDK pushes fresh CustomerInfo after
  // purchases, restores, renewals, and logIn/logOut. Never poll for this.
  useEffect(() => {
    if (!rcEnabled) return;
    ensureRevenueCat().then((ok) => {
      if (!ok) return;
      try {
        const listener = (info: CustomerInfo) =>
          queryClient.setQueryData(["revenuecat", "customer-info"], info);
        Purchases.addCustomerInfoUpdateListener(listener);
        return () => {
          Purchases.removeCustomerInfoUpdateListener(listener);
        };
      } catch (err) {
        console.warn("[RevenueCat] CustomerInfoUpdateListener error:", err);
      }
    });
  }, [queryClient]);

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: PurchasesPackage) => {
      await ensureRevenueCat();
      // Choke point: never let an anonymous purchase through.
      if (!currentAppUserId) throw new Error("identity_not_ready");
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      await ensureRevenueCat();
      return Purchases.restorePurchases();
    },
  });

  const isSubscribed =
    customerInfoQuery.data?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;

  // True after a successful rcLogIn — reactive via the module-flag store.
  const identityReady = useSyncExternalStore(
    (cb) => { identitySubs.add(cb); return () => { identitySubs.delete(cb); }; },
    () => currentAppUserId !== null,
  );

  return {
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    isSubscribed,
    identityReady,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    refetchCustomerInfo: customerInfoQuery.refetch,
  };
}

type RCSubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<RCSubscriptionContextValue | null>(null);

export function RCSubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useRCSubscription() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useRCSubscription must be used within a RCSubscriptionProvider");
  return ctx;
}
