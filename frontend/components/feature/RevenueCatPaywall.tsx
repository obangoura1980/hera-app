import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { router } from 'expo-router';
import { useSubscription } from '@/hooks/useSubscription';
import { REVENUECAT_ENTITLEMENT_IDENTIFIER, ensureRevenueCat } from '@/src/lib/revenuecat';

interface RevenueCatPaywallProps {
  onDismiss?: () => void;
  onPurchaseSuccess?: () => void;
}

export function RevenueCatPaywall({
  onDismiss,
  onPurchaseSuccess,
}: RevenueCatPaywallProps) {
  const { checkSubscription } = useSubscription();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    ensureRevenueCat().then(() => {
      if (isMounted) setReady(true);
    });
    return () => {
      isMounted = false;
    };
  }, []);

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

  if (!ready) {
    return (
      <View style={st.centered}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={st.loadingText}>Loading Paywall...</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={st.centered}>
        <Text style={st.errorTitle}>Hera Premium</Text>
        <Text style={st.errorText}>
          In-app purchases are available on the mobile app. Please open Hera on your iOS or Android device.
        </Text>
        <Pressable style={st.retryBtn} onPress={handleDismiss}>
          <Text style={st.retryBtnText}>Continue to App</Text>
        </Pressable>
      </View>
    );
  }

  // Pure Paywall UI — automatically loads the Paywall configured in RevenueCat
  return (
    <View style={st.container}>
      <RevenueCatUI.Paywall
        style={st.paywall}
        options={{
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
