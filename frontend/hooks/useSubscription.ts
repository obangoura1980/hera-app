import { useContext } from 'react';
import { SubscriptionContext } from '@/contexts/SubscriptionContext';

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}

// Re-export Plan type for convenience
export type { Plan } from '@/contexts/SubscriptionContext';

