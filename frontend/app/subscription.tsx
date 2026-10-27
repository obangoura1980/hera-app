import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useSubscription } from '@/hooks/useSubscription';
import { RevenueCatPaywall } from '@/components/feature/RevenueCatPaywall';
import Ionicons from '@react-native-vector-icons/ionicons';

export default function SubscriptionScreen() {
  const { isSubscribed } = useSubscription();

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
  closeBtn: {
    position: 'absolute',
    right: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
});
