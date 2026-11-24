export async function initMetaAttribution(): Promise<boolean> {
  return false;
}

export async function syncMetaAttributionToRevenueCat(_forceSync = false): Promise<void> {
  // Meta's native SDK is unavailable on web and in Expo Go.
}
