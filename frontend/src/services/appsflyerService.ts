/**
 * appsflyerService — web no-op. The AppsFlyer native SDK is intentionally
 * disabled on web/Expo web preview (native module doesn't exist there).
 */
export type AppsFlyerEventName =
  | 'af_complete_registration'
  | 'af_login'
  | 'af_start_trial';

export async function initAppsFlyer(): Promise<void> {
  // no-op on web
}

export async function logAppsFlyerEvent(
  _name: AppsFlyerEventName,
  _values: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  // no-op on web
}

export function trackAppsFlyerEvent(
  _name: AppsFlyerEventName,
  _values: Record<string, string | number | boolean | null> = {},
): void {
  // no-op on web
}
