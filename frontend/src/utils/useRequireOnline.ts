import { useCallback } from 'react';
import { useAlert } from '@/template';
import { isOnline, OFFLINE_MESSAGE, OFFLINE_TITLE } from '@/src/utils/network';

/** Returns `requireOnline()`: shows the offline alert and returns false when there is no connection. */
export function useRequireOnline() {
  const { showAlert } = useAlert();
  return useCallback((): boolean => {
    if (isOnline()) return true;
    showAlert(OFFLINE_TITLE, OFFLINE_MESSAGE);
    return false;
  }, [showAlert]);
}
