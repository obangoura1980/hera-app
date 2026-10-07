/**
 * appsflyerService — AppsFlyer attribution/analytics (native, iOS + Android).
 * react-native-appsflyer v6 API (initSdk → startSdk, positional logEvent).
 * Initialized once at app launch; events are fire-and-forget and must never
 * break auth or purchase flows.
 *
 * Platforms:
 *  - iOS:     identified by devKey + Apple App ID (EXPO_PUBLIC_APPSFLYER_IOS_APP_ID)
 *  - Android: identified by devKey + the build's package name (com.hera.herapp,
 *             set in app.json android.package) — the SDK reads it automatically.
 */
import appsFlyer from 'react-native-appsflyer';
import { Platform } from 'react-native';

const DEV_KEY = process.env.EXPO_PUBLIC_APPSFLYER_DEV_KEY ?? '';
const IOS_APP_ID = process.env.EXPO_PUBLIC_APPSFLYER_IOS_APP_ID;
export const ANDROID_PACKAGE = 'com.hera.herapp'; // informational — taken from app.json at build time

let initPromise: Promise<void> | undefined;

export function initAppsFlyer(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!DEV_KEY) {
      if (__DEV__) console.warn('[AppsFlyer] dev key missing — analytics disabled');
      return;
    }
    await appsFlyer.initSdk({
      devKey: DEV_KEY,
      appId: Platform.OS === 'ios' ? IOS_APP_ID : undefined, // Android resolves via package name
      isDebug: __DEV__,
      onInstallConversionDataListener: true,
    });
    appsFlyer.startSdk();
    if (__DEV__) console.log(`[AppsFlyer] SDK initialized (${Platform.OS})`);
  })();

  return initPromise;
}

export type AppsFlyerEventName =
  | 'af_complete_registration'
  | 'af_login'
  | 'af_start_trial';

export async function logAppsFlyerEvent(
  name: AppsFlyerEventName,
  values: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  if (!DEV_KEY) return;
  await initAppsFlyer();
  await appsFlyer.logEvent(name, values);
}

/** Fire-and-forget wrapper — analytics failures are logged, never thrown. */
export function trackAppsFlyerEvent(
  name: AppsFlyerEventName,
  values: Record<string, string | number | boolean | null> = {},
): void {
  logAppsFlyerEvent(name, values).catch((error) => {
    if (__DEV__) console.warn(`[AppsFlyer] ${name} event failed`, error);
  });
}
