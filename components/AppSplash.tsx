import {
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { SPLASH_BACKGROUND_COLOR, SPLASH_SPINNER_COLOR } from '@/lib/splash';

const splashBackgroundImage =
  require('../assets/images/splash-background.png') as ImageSourcePropType;

const { height: windowHeight, width: windowWidth } = Dimensions.get('window');

type AppSplashProps = {
  onImageReady?: () => void;
};

export default function AppSplash({ onImageReady }: AppSplashProps) {
  return (
    <ImageBackground
      accessibilityIgnoresInvertColors
      imageStyle={styles.backgroundImage}
      onError={onImageReady}
      onLoad={onImageReady}
      resizeMode="cover"
      source={splashBackgroundImage}
      style={styles.screen}
    >
      <View style={styles.spinnerContainer}>
        <ActivityIndicator color={SPLASH_SPINNER_COLOR} size="large" />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: SPLASH_BACKGROUND_COLOR,
    height: windowHeight,
    width: windowWidth,
  },
  backgroundImage: {
    height: windowHeight,
    width: windowWidth,
  },
  spinnerContainer: {
    alignItems: 'center',
    height: windowHeight * 0.4,
    justifyContent: 'center',
    width: windowWidth,
  },
});
