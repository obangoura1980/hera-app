const { withInfoPlist } = require('@expo/config-plugins');
const facebookPlugin = require('react-native-fbsdk-next/app.plugin');
const withFacebook = facebookPlugin.default || facebookPlugin;

/**
 * react-native-fbsdk-next's Expo plugin accepts one App ID for both platforms.
 * Hera has separate Meta apps for Android and iOS, so configure Android with
 * the upstream plugin and then replace only the iOS-specific values.
 */
module.exports = function withMetaSDK(config, props = {}) {
  const {
    androidAppID,
    iosAppID,
    androidClientToken = '',
    iosClientToken = '',
    displayName = 'Hera',
  } = props;

  if (!androidAppID || !iosAppID) {
    throw new Error('Hera Meta Android and iOS App IDs are required.');
  }

  config = withFacebook(config, {
    appID: androidAppID,
    clientToken: androidClientToken,
    displayName,
    scheme: `fb${androidAppID}`,
    // RevenueCat is the only purchase/revenue event sender to Meta.
    autoLogAppEventsEnabled: false,
    advertiserIDCollectionEnabled: false,
    // Initialize after the shared ATT consent flow runs.
    isAutoInitEnabled: false,
    iosUserTrackingPermission: 'Helps us understand how you discovered Hera and improve relevant advertising.',
  });

  return withInfoPlist(config, (iosConfig) => {
    const info = iosConfig.modResults;
    const androidScheme = `fb${androidAppID}`;
    const iosScheme = `fb${iosAppID}`;

    info.FacebookAppID = iosAppID;
    info.FacebookDisplayName = displayName;
    info.FacebookAutoInitEnabled = false;
    info.FacebookAutoLogAppEventsEnabled = false;
    info.FacebookAdvertiserIDCollectionEnabled = false;

    if (iosClientToken) info.FacebookClientToken = iosClientToken;
    else delete info.FacebookClientToken;

    const urlTypes = Array.isArray(info.CFBundleURLTypes) ? info.CFBundleURLTypes : [];
    info.CFBundleURLTypes = urlTypes
      .map((entry) => ({
        ...entry,
        CFBundleURLSchemes: (entry.CFBundleURLSchemes || []).filter(
          (scheme) => scheme !== androidScheme && scheme !== iosScheme,
        ),
      }))
      .filter((entry) => entry.CFBundleURLSchemes.length > 0);
    info.CFBundleURLTypes.push({ CFBundleURLSchemes: [iosScheme] });

    return iosConfig;
  });
};
