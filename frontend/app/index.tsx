import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@/src/utils/async-storage';
import { useAuth } from '@/template';
import { useSubscription } from '@/hooks/useSubscription';

export default function Index() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { isSubscribed, isTrial, isLoading: subLoading } = useSubscription();
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('hera_onboarded')
      .then(v => { setOnboarded(v === 'true'); setReady(true); })
      .catch(() => setReady(true));
  }, []);

  // Wait for onboarding check, auth, and subscription to resolve
  if (!ready || authLoading || subLoading) {
    return <View style={{ flex: 1, backgroundColor: '#080A18' }} />;
  }

  // New user — send to onboarding
  if (!onboarded) return <Redirect href="/onboarding" />;

  // Onboarded user — go to main app
  return <Redirect href="/(tabs)" />;
}
