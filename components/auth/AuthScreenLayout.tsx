import { MaterialIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import KeyboardDismissScrollView from '@/components/KeyboardDismissScrollView';
import { useTheme } from '@/contexts/ThemeContext';
import { radius, space } from '@/lib/design';
import { CONTENT_MAX_WIDTH } from '@/lib/slideTransition';

const catLightImage = require('../../assets/images/splash-light.png') as ImageSourcePropType;
const catDarkImage = require('../../assets/images/splash-dark.png') as ImageSourcePropType;

const CAT_WIDTH_SCALE = 0.8;

// Taken from the image files themselves: a stale hard-coded ratio letterboxed
// the art under `contain`, leaving a gap between the cat and the screen bottom.
function getImageAspectRatio(source: ImageSourcePropType): number {
  const { width, height } = Image.resolveAssetSource(source);
  return width / height;
}

type AuthScreenLayoutProps = {
  children: ReactNode;
  /** Shows a back button in the top-left corner. */
  onBack?: () => void;
};

/**
 * The screen the opening screen, sign in and sign up share: content from near
 * the top, over the cat anchored to the bottom edge of the screen.
 */
export default function AuthScreenLayout({ children, onBack }: AuthScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const layoutWidth = Math.min(windowWidth, CONTENT_MAX_WIDTH);
  const { colors, colorScheme } = useTheme();
  const catImage = colorScheme === 'dark' ? catDarkImage : catLightImage;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.frame, { width: layoutWidth }]}>
        <View style={[styles.catContainer, { width: layoutWidth }]}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={catImage}
            style={[
              styles.cat,
              {
                aspectRatio: getImageAspectRatio(catImage),
                width: layoutWidth * CAT_WIDTH_SCALE,
              },
            ]}
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.content, { paddingTop: insets.top + space[12] }]}
        >
          <KeyboardDismissScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </KeyboardDismissScrollView>
        </KeyboardAvoidingView>

        {onBack ? (
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: colors.surface,
                opacity: pressed ? 0.7 : 1,
                top: insets.top + space[4],
              },
            ]}
          >
            <MaterialIcons color={colors.primary} name="chevron-left" size={24} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    flex: 1,
    overflow: 'hidden',
  },
  frame: {
    flex: 1,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  catContainer: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  cat: {
    height: undefined,
  },
  content: {
    flex: 1,
    paddingHorizontal: space[8],
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: radius.xl,
    height: 44,
    justifyContent: 'center',
    left: space[6],
    position: 'absolute',
    width: 44,
  },
});
