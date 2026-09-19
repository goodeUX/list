const appJson = require('./app.json');

function getWebHost() {
  const configured = process.env.EXPO_PUBLIC_APP_WEB_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).hostname;
    } catch {
      // fall through
    }
  }

  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (projectId) {
    return `${projectId}.web.app`;
  }

  return null;
}

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => {
  const host = getWebHost();
  const expo = { ...appJson.expo };

  expo.ios = {
    ...expo.ios,
    bundleIdentifier: 'com.geo_goo.list',
  };

  if (host) {
    expo.ios.associatedDomains = [`applinks:${host}`];
    expo.android = {
      ...expo.android,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host,
              pathPrefix: '/join',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    };
  }

  const googleIosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME?.trim();
  expo.plugins = [
    ...(expo.plugins ?? []),
    googleIosUrlScheme
      ? ['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]
      : '@react-native-google-signin/google-signin',
    [
      'expo-share-intent',
      {
        // v1 scope: Android only, receive shared plain text / URLs from the
        // system share sheet. iOS needs an app group + share extension, which
        // is deferred, so it is disabled here to keep iOS builds unchanged.
        androidIntentFilters: ['text/plain'],
        disableIOS: true,
      },
    ],
  ];

  return { expo };
};
