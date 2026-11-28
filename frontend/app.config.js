const { expo: baseConfig } = require('./app.json');

const androidAppID = process.env.META_ANDROID_APP_ID || '2646377025800703';
// Hera's Android and iOS configurations now share one Meta app.
const iosAppID = process.env.META_IOS_APP_ID || '2646377025800703';
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
