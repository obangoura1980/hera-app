/**
 * withAndroidBackupRulesFix — resolves the AndroidManifest merger conflict
 * between expo-secure-store's backup rules (android:fullBackupContent /
 * android:dataExtractionRules on <application>) and the AppsFlyer SDK's
 * library manifest (af-android-sdk declares its own values for the same
 * attributes).
 *
 * Adds tools:replace="android:dataExtractionRules,android:fullBackupContent"
 * so the app's own rules (expo-secure-store) take precedence. Keeps
 * preferAppsFlyerBackupRules=false so secure-store rules are preserved.
 *
 * Must be listed AFTER expo-secure-store and react-native-appsflyer in
 * app.json plugins so its withAndroidManifest mod runs last.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidBackupRulesFix(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const application = manifest.application && manifest.application[0];
    if (application && application.$) {
      const attrs = ['android:dataExtractionRules', 'android:fullBackupContent'];
      const existing = application.$['tools:replace'];
      const merged = new Set(existing ? existing.split(',') : []);
      attrs.forEach((attr) => merged.add(attr));
      application.$['tools:replace'] = Array.from(merged).join(',');
    }

    return cfg;
  });
};
