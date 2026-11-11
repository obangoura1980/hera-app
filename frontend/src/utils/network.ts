/**
 * network.ts — single source of truth for connectivity.
 * `isOnline()` is a synchronous check used BEFORE any network action is attempted.
 * The UI guard hook lives in useRequireOnline.ts (kept separate to avoid an import cycle with api.ts).
 */
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export const OFFLINE_TITLE = 'No Internet Connection';
export const OFFLINE_MESSAGE = 'An internet connection is required to complete this action. Please reconnect and try again.';

let online = true;

if (Platform.OS === 'web') {
  if (typeof window !== 'undefined') {
    const update = () => { online = navigator.onLine; };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
  }
} else {
  // No connection → offline immediately. "Not reachable" alone can flicker on
  // phones, so only treat it as offline if it persists for 2s.
  let unreachableTimer: ReturnType<typeof setTimeout> | null = null;
  NetInfo.addEventListener(s => {
    if (unreachableTimer) { clearTimeout(unreachableTimer); unreachableTimer = null; }
    if (s.isConnected === false) { online = false; return; }
    if (s.isInternetReachable === false) {
      unreachableTimer = setTimeout(() => { online = false; }, 2000);
      return;
    }
    online = true;
  });
}

export function isOnline(): boolean {
  return online;
}

export class OfflineError extends Error {
  constructor() {
    super(OFFLINE_MESSAGE);
    this.name = 'OfflineError';
  }
}

/** Throws before a request is sent when the device is offline. */
export function assertOnline(): void {
  if (!online) throw new OfflineError();
}
