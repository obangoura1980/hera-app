/**
 * appsflyerService — AppsFlyer attribution/analytics (native, iOS + Android).
 * react-native-appsflyer v7 API (Promise-based RPC: init → start, logEvent).
 * Initialized once at app launch; events are fire-and-forget and must never
 * break auth or purchase flows.
 *
 * Platforms:
 *  - iOS:     identified by devKey + Apple App ID (6801563533)
 *  - Android: identified by devKey + the build's package name (com.hera.herapp,
 *             set in app.json android.package) — the SDK reads it automatically.
 */
import appsFlyer from 'react-native-appsflyer';
import { Platform } from 'react-native';

const DEV_KEY = 'cyVDRB8MLP49vNiTAa4LRN';
const IOS_APP_ID = '6801563533';   // Apple App ID (numbers only)
export const ANDROID_PACKAGE = 'com.hera.herapp'; // informational — taken from app.json at build time

let initPromise: Promise<void> | undefined;

export function initAppsFlyer(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (__DEV__) await appsFlyer.enableDebug({ enabled: true });
    await appsFlyer.init({
      devKey: DEV_KEY,
      appId: Platform.OS === 'ios' ? IOS_APP_ID : null, // Android resolves via package name
    });
    await appsFlyer.start();
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
  await initAppsFlyer();
  await appsFlyer.logEvent({ eventName: name, eventValues: values });
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
