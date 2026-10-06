/**
 * appsflyerService — AppsFlyer attribution/analytics (native).
 * Initialized once at app launch; events are fire-and-forget and must never
 * break auth or purchase flows.
 */
import appsFlyer from 'react-native-appsflyer';

const DEV_KEY = 'cyVDRB8MLP49vNiTAa4LRN';
const IOS_APP_ID = '6801563533';

let initPromise: Promise<void> | undefined;

export function initAppsFlyer(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    appsFlyer.initSdk(
      {
        devKey: DEV_KEY,
        appId: IOS_APP_ID,
        isDebug: __DEV__,
        onInstallConversionDataListener: false,
        onDeepLinkListener: false,
      },
      () => resolve(),
      (error) => reject(error),
    );
  });

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

  return new Promise((resolve, reject) => {
    appsFlyer.logEvent(
      name,
      values,
      () => resolve(),
      (error) => reject(error),
    );
  });
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
