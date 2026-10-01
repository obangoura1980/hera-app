import { useContext } from 'react';
import { HeraContext } from '@/contexts/HeraContext';

export function useHera() {
  const ctx = useContext(HeraContext);
  if (!ctx) throw new Error('useHera must be used within HeraProvider');
  return ctx;
}
