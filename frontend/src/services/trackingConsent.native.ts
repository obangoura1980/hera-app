import { Platform } from 'react-native';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';

export type TrackingConsentStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

let consentPromise: Promise<TrackingConsentStatus> | undefined;

/**
 * One shared ATT request for every attribution SDK. Calling this from both
 * AppsFlyer and Meta cannot display two prompts or race their initialization.
 */
export function getOrRequestTrackingConsent(): Promise<TrackingConsentStatus> {
  if (Platform.OS !== 'ios') return Promise.resolve('granted');
  if (consentPromise) return consentPromise;

  consentPromise = (async () => {
    try {
      const current = await getTrackingPermissionsAsync();
      if (current.status !== 'undetermined' || !current.canAskAgain) {
        return current.status as TrackingConsentStatus;
      }
      const result = await requestTrackingPermissionsAsync();
      return result.status as TrackingConsentStatus;
    } catch (error) {
      if (__DEV__) console.warn('[ATT] permission request failed', error);
      return 'unavailable';
    }
  })();

  return consentPromise;
}
