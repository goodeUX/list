import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { SPLASH_BACKGROUND_COLOR } from '@/lib/splash';

const splashDogImage = require('../assets/images/splash-dog.png') as ImageSourcePropType;

type AppSplashProps = {
  onImageReady?: () => void;
};

export default function AppSplash({ onImageReady }: AppSplashProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.dogContainer}>
        <Image
          accessibilityIgnoresInvertColors
          onError={onImageReady}
          onLoad={onImageReady}
          resizeMode="contain"
          source={splashDogImage}
          style={styles.dogImage}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: SPLASH_BACKGROUND_COLOR,
    flex: 1,
  },
  dogContainer: {
    alignItems: 'flex-end',
    bottom: 0,
    height: '54%',
    justifyContent: 'flex-end',
    position: 'absolute',
    right: 0,
    width: '92%',
  },
  dogImage: {
    height: '100%',
    width: '100%',
  },
});
