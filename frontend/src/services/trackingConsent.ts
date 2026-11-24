export type TrackingConsentStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export function getOrRequestTrackingConsent(): Promise<TrackingConsentStatus> {
  return Promise.resolve('unavailable');
}
