/**
 * revenuecat.tsx — RevenueCat client (offerings, purchases, restore, identity).
 * Gating source of truth: customerInfo.entitlements.active['pro'].
 * Web preview runs against the RevenueCat Test Store (simulated purchases).
 * Native builds always use their platform store key, including development and
 * sandbox builds, so StoreKit/Play Billing can load the real configured products.
 */
import React, { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
// RevenueCat public SDK keys are designed to ship in the client. Pin the App
// Store key to the com.hera.herapp entry so a stale build-service environment
// variable cannot silently compile a key for an older RevenueCat app.
const REVENUECAT_IOS_API_KEY = "appl_nRHvPjOiMewtpDZxFfXIoTHznjo";
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "pro"; // from setup: entitlement_lookup_key

export const rcEnabled = Platform.OS !== "web" || __DEV__; // web preview uses the Test Store

function requireRevenueCatKey(
  name: string,
  value: string | undefined,
  expectedPrefix: "appl_" | "goog_" | "test_",
) {
  const key = value?.trim();
  if (!key) {
    throw new Error(`${name} is missing from the build environment`);
  }
  if (!key.startsWith(expectedPrefix)) {
    throw new Error(`${name} must use a ${expectedPrefix} RevenueCat public SDK key`);
  }
  return key;
}

export function getRevenueCatApiKey() {
  if (Platform.OS === "ios") {
    return requireRevenueCatKey(
      "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
      REVENUECAT_IOS_API_KEY,
      "appl_",
    );
  }
  if (Platform.OS === "android") {
    return requireRevenueCatKey(
      "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
      REVENUECAT_ANDROID_API_KEY,
      "goog_",
    );
  }
  return requireRevenueCatKey(
    "EXPO_PUBLIC_REVENUECAT_TEST_API_KEY",
    REVENUECAT_TEST_API_KEY,
    "test_",
  );
}

export function initializeRevenueCat() {
  if (!rcEnabled) return; // no store on production web
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: getRevenueCatApiKey() });
}

// RevenueCat identity — originalAppUserId stays "$RCAnonymousID:…" after the
// first anonymous merge even when logIn() succeeds (documented RC behavior), so
// identity readiness is tracked from the logIn() RESOLUTION, not CustomerInfo.
// The flag is exposed reactively via useSyncExternalStore so consumers re-render.
let currentAppUserId: string | null = null;
const identitySubs = new Set<() => void>();
const notifyIdentity = () => identitySubs.forEach(cb => cb());
export async function rcLogIn(userId: string) {
  const res = await Purchases.logIn(userId);
  currentAppUserId = userId;
  notifyIdentity();
  return res;
}
export async function rcLogOut() {
  currentAppUserId = null;
  notifyIdentity();
  await Purchases.logOut();
}
export const getRCAppUserId = () => currentAppUserId;

function useSubscriptionContext() {
  const queryClient = useQueryClient();

  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: () => Purchases.getCustomerInfo(),
    enabled: rcEnabled,
    staleTime: 60 * 1000,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: () => Purchases.getOfferings(),
    enabled: rcEnabled,
    staleTime: 300 * 1000,
  });

  // Reactive entitlement updates — the SDK pushes fresh CustomerInfo after
  // purchases, restores, renewals, and logIn/logOut. Never poll for this.
  useEffect(() => {
    if (!rcEnabled) return;
    const listener = (info: CustomerInfo) =>
      queryClient.setQueryData(["revenuecat", "customer-info"], info);
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [queryClient]);

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: PurchasesPackage) => {
      // Choke point: never let an anonymous purchase through.
      if (!currentAppUserId) throw new Error("identity_not_ready");
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => Purchases.restorePurchases(),
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
