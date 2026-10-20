import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSubscription } from '@/hooks/useSubscription';
import { RevenueCatPaywall } from '@/components/feature/RevenueCatPaywall';

export default function SubscriptionScreen() {
  const { isSubscribed } = useSubscription();
  const { offeringId = 'default' } = useLocalSearchParams<{ offeringId?: string }>();

  useEffect(() => {
    if (isSubscribed) {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(tabs)');
    }
  }, [isSubscribed]);

  const handleDismiss = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={st.container}>
      <RevenueCatPaywall
        offeringId={offeringId}
        onDismiss={handleDismiss}
        onPurchaseSuccess={() => {
          if (router.canDismiss()) router.dismissAll();
          router.replace('/(tabs)');
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
});
