import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { SPLASH_SPINNER_COLOR } from '@/lib/splash';

const splashBackgroundImage =
  require('../assets/images/splash-background.png') as ImageSourcePropType;

type AppSplashProps = {
  onImageReady?: () => void;
};

export default function AppSplash({ onImageReady }: AppSplashProps) {
  return (
    <View style={styles.screen}>
      <Image
        accessibilityIgnoresInvertColors
        onError={onImageReady}
        onLoad={onImageReady}
        resizeMode="cover"
        source={splashBackgroundImage}
        style={styles.backgroundImage}
      />
      <View style={styles.spinnerContainer}>
        <ActivityIndicator color={SPLASH_SPINNER_COLOR} size="large" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    width: '100%',
  },
  spinnerContainer: {
    alignItems: 'center',
    height: '40%',
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
