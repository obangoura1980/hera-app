import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import Purchases, { PurchasesOffering } from 'react-native-purchases';
import { router } from 'expo-router';
import { useSubscription } from '@/hooks/useSubscription';
import { useRCSubscription, REVENUECAT_ENTITLEMENT_IDENTIFIER, ensureRevenueCat } from '@/src/lib/revenuecat';

interface RevenueCatPaywallProps {
  offeringId?: string; // Default: 'default'
  onDismiss?: () => void;
  onPurchaseSuccess?: () => void;
}

export function RevenueCatPaywall({
  offeringId = 'default',
  onDismiss,
  onPurchaseSuccess,
}: RevenueCatPaywallProps) {
  const { checkSubscription } = useSubscription();
  const { offerings, isLoading: isRCLoading } = useRCSubscription();
  const [selectedOffering, setSelectedOffering] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOffering() {
      try {
        setLoading(true);
        setLoadError(null);
        await ensureRevenueCat();

        // Fetch fresh offerings if not available from context
        const allOfferings = offerings || (await Purchases.getOfferings());
        const match =
          allOfferings?.all?.[offeringId] ||
          allOfferings?.current ||
          null;

        if (isMounted) {
          setSelectedOffering(match);
        }
      } catch (err: any) {
        console.warn('[RevenueCatPaywall] Failed to fetch offerings:', err);
        if (isMounted) {
          setLoadError(err?.message || 'Failed to load paywall offerings.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOffering();
    return () => {
      isMounted = false;
    };
  }, [offeringId, offerings]);

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handlePurchaseCompleted = async (customerInfo: any) => {
    try {
      await checkSubscription();
      const isPro = !!customerInfo?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER];
      if (isPro) {
        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        } else {
          if (router.canDismiss()) router.dismissAll();
          router.replace('/(tabs)');
        }
      }
    } catch (e) {
      console.warn('[RevenueCatPaywall] Post-purchase sync error:', e);
    }
  };

  const handleRestoreCompleted = async (customerInfo: any) => {
    try {
      await checkSubscription();
      const isPro = !!customerInfo?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER];
      if (isPro) {
        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        } else {
          if (router.canDismiss()) router.dismissAll();
          router.replace('/(tabs)');
        }
      }
    } catch (e) {
      console.warn('[RevenueCatPaywall] Restore sync error:', e);
    }
  };

  if (loading || isRCLoading) {
    return (
      <View style={st.centered}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={st.loadingText}>Loading Paywall...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={st.centered}>
        <Text style={st.errorTitle}>Hera Premium</Text>
        <Text style={st.errorText}>
          {loadError.includes('singleton')
            ? 'Preparing store options. You can continue exploring Hera.'
            : loadError}
        </Text>
        <Pressable style={st.retryBtn} onPress={handleDismiss}>
          <Text style={st.retryBtnText}>Continue to App</Text>
        </Pressable>
      </View>
    );
  }

  // Render the RevenueCat UI Paywall component
  return (
    <View style={st.container}>
      <RevenueCatUI.Paywall
        style={st.paywall}
        options={{
          offering: selectedOffering || undefined,
          displayCloseButton: true,
        }}
        onPurchaseCompleted={({ customerInfo }) => handlePurchaseCompleted(customerInfo)}
        onRestoreCompleted={({ customerInfo }) => handleRestoreCompleted(customerInfo)}
        onDismiss={handleDismiss}
        onPurchaseError={({ error }) => {
          if (!error.userCancelled) {
            console.warn('[RevenueCatPaywall] Purchase error:', error);
          }
        }}
        onRestoreError={({ error }) => {
          console.warn('[RevenueCatPaywall] Restore error:', error);
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080415',
  },
  paywall: {
    flex: 1,
  },
  centered: {
    flex: 1,
    backgroundColor: '#080415',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    color: '#D4CEEE',
    fontSize: 15,
    fontWeight: '500',
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  errorText: {
    color: '#A096C0',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
  },
  retryBtnText: {
    color: '#080415',
    fontWeight: '700',
    fontSize: 14,
  },
});
