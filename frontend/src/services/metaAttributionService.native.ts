import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { AppEventsLogger, Settings } from 'react-native-fbsdk-next';
import { getOrRequestTrackingConsent } from './trackingConsent';

type MetaAttributionConfig = {
  androidAppID?: string;
  iosAppID?: string;
  androidConfigured?: boolean;
  iosConfigured?: boolean;
};

const config = (Constants.expoConfig?.extra?.metaAttribution ?? {}) as MetaAttributionConfig;
const isConfigured = Platform.OS === 'ios' ? config.iosConfigured : config.androidConfigured;

let initPromise: Promise<boolean> | undefined;

async function attachIdentifiersToRevenueCat(): Promise<void> {
  // RevenueCat collects $idfa/$idfv/$ip on iOS and $gpsAdId/$ip on Android.
  await Purchases.collectDeviceIdentifiers();
  const facebookAnonymousID = await AppEventsLogger.getAnonymousID();
  if (facebookAnonymousID) {
    await Purchases.setFBAnonymousID(facebookAnonymousID);
  }
}

/** Initialize Meta App Events without automatic purchase/revenue logging. */
export function initMetaAttribution(): Promise<boolean> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!isConfigured) {
      if (__DEV__) console.warn(`[Meta] ${Platform.OS} client token missing — attribution disabled`);
      return false;
    }

    // RevenueCat sends subscription lifecycle and revenue events server-side.
    // Leaving Meta purchase auto-logging disabled prevents double counting.
    Settings.setAutoLogAppEventsEnabled(false);
    Settings.setAdvertiserIDCollectionEnabled(Platform.OS === 'android');

    let trackingAuthorized = Platform.OS !== 'ios';
    if (Platform.OS === 'ios') {
      trackingAuthorized = (await getOrRequestTrackingConsent()) === 'granted';
      Settings.setAdvertiserIDCollectionEnabled(trackingAuthorized);
    }

    Settings.initializeSDK();

    if (Platform.OS === 'ios') {
      await Settings.setAdvertiserTrackingEnabled(trackingAuthorized);
    }

    // The RN wrapper does not expose native activateApp(); log only the
    // standard activation event manually. Purchases remain server-side via RC.
    AppEventsLogger.logEvent('fb_mobile_activate_app');
    await attachIdentifiersToRevenueCat();

    if (__DEV__) console.log(`[Meta] attribution initialized (${Platform.OS})`);
    return true;
  })().catch((error) => {
    if (__DEV__) console.warn('[Meta] attribution initialization failed', error);
    return false;
  });

  return initPromise;
}

/**
 * Re-attach identifiers after RevenueCat logIn so they belong to the provided
 * App User ID. Set forceSync immediately before purchase to avoid an attribute
 * upload race with RevenueCat's server-side event.
 */
export async function syncMetaAttributionToRevenueCat(forceSync = false): Promise<void> {
  if (!(await initMetaAttribution())) return;
  await attachIdentifiersToRevenueCat();
  if (forceSync) await Purchases.syncAttributesAndOfferingsIfNeeded();
}
