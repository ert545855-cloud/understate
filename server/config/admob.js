// AdMob Configuration
// App ID:    ca-app-pub-7362104594733603~3744323984
// Ad Unit:   ca-app-pub-7362104594733603/8613507280
//
// Usage:
//   - Web PWA  → Google AdSense (see js/admob.js overlay system)
//   - Android  → Capacitor AdMob plugin (@capacitor-community/admob)
//   - iOS      → Capacitor AdMob plugin (@capacitor-community/admob)
//
// Capacitor integration example:
//   const { AdMob } = await import('@capacitor-community/admob');
//   await AdMob.initialize({ appId: ADMOB_CONFIG.APP_ID });
//   await AdMob.showInterstitial({ adId: ADMOB_CONFIG.INTERSTITIAL_ID });

const ADMOB_CONFIG = {
  APP_ID:          'ca-app-pub-7362104594733603~3744323984',
  INTERSTITIAL_ID: 'ca-app-pub-7362104594733603/8613507280',
  // Add more ad units here:
  // BANNER_ID:    'ca-app-pub-XXXXXXXXXXXXXX/YYYYYYYYYY',
  // REWARDED_ID:  'ca-app-pub-XXXXXXXXXXXXXX/ZZZZZZZZZZ',

  // Test IDs (use these during development)
  TEST_APP_ID:          'ca-app-pub-3940256099942544~3347511713',
  TEST_INTERSTITIAL_ID: 'ca-app-pub-3940256099942544/1033173712',
  TEST_BANNER_ID:       'ca-app-pub-3940256099942544/6300978111',
  TEST_REWARDED_ID:     'ca-app-pub-3940256099942544/5224354917',
};

// Expose safe public config (no secrets) via /api/admob-config endpoint
function getPublicAdConfig(isDev) {
  return {
    interstitialId: isDev ? ADMOB_CONFIG.TEST_INTERSTITIAL_ID : ADMOB_CONFIG.INTERSTITIAL_ID,
    appId:          isDev ? ADMOB_CONFIG.TEST_APP_ID : ADMOB_CONFIG.APP_ID,
    isTest:         isDev,
  };
}

module.exports = { ADMOB_CONFIG, getPublicAdConfig };
