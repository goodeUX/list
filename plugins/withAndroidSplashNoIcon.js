const {
  withFinalizedMod,
  AndroidConfig,
  XML,
} = require('expo/config-plugins');
const path = require('path');

const SPLASH_THEME = {
  name: 'Theme.App.SplashScreen',
  parent: 'Theme.SplashScreen',
};

const SPLASH_ICON_STYLE_NAMES = [
  'android:windowSplashScreenAnimatedIcon',
  'windowSplashScreenAnimatedIcon',
  'android:windowSplashScreenBehavior',
  'windowSplashScreenBehavior',
  'android:windowSplashScreenIconBackgroundColor',
  'windowSplashScreenIconBackgroundColor',
];

/** Remove Android 12's centered splash icon so only the background color shows. */
function withAndroidSplashNoIcon(config) {
  return withFinalizedMod(config, [
    'android',
    async (config) => {
      const stylesPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/values/styles.xml',
      );

      let styles = await AndroidConfig.Styles.readStylesXMLAsync({
        path: stylesPath,
      });

      for (const name of SPLASH_ICON_STYLE_NAMES) {
        styles = AndroidConfig.Styles.assignStylesValue(styles, {
          add: false,
          name,
          parent: SPLASH_THEME,
        });
      }

      await XML.writeXMLAsync({
        path: stylesPath,
        xml: styles,
      });

      return config;
    },
  ]);
}

module.exports = withAndroidSplashNoIcon;
