import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { SPLASH_BACKGROUND_COLOR, SPLASH_SPINNER_COLOR } from '@/lib/splash';

const splashDogImage = require('../assets/images/splash-dog.png') as ImageSourcePropType;

type AppSplashProps = {
  onImageReady?: () => void;
};

export default function AppSplash({ onImageReady }: AppSplashProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.spinnerContainer}>
        <ActivityIndicator color={SPLASH_SPINNER_COLOR} size="large" />
      </View>
      <View style={styles.imageContainer}>
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_BACKGROUND_COLOR,
    flex: 1,
  },
  spinnerContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
  },
  dogImage: {
    aspectRatio: 1,
    width: '100%',
  },
});
