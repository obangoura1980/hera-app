const { expo: baseConfig } = require('./app.json');

const androidAppID = process.env.META_ANDROID_APP_ID || '2646377025800703';
// The client supplied this as the Hera Apple app. Keep it overridable until
// the duplicate Hera_Apple ID in Meta is confirmed.
const iosAppID = process.env.META_IOS_APP_ID || '1749331766301889';
const androidClientToken = process.env.META_ANDROID_CLIENT_TOKEN || '';
const iosClientToken = process.env.META_IOS_CLIENT_TOKEN || '';

module.exports = () => ({
  ...baseConfig,
  plugins: [
    ...(baseConfig.plugins || []),
    [
      './plugins/withMetaSDK',
      {
        androidAppID,
        iosAppID,
        androidClientToken,
        iosClientToken,
        displayName: 'Hera',
      },
    ],
  ],
  extra: {
    ...(baseConfig.extra || {}),
    metaAttribution: {
      androidAppID,
      iosAppID,
      androidConfigured: Boolean(androidAppID && androidClientToken),
      iosConfigured: Boolean(iosAppID && iosClientToken),
    },
  },
});
