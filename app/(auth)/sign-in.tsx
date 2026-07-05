import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthJourney from '@/components/auth/AuthJourney';
import KeyboardDismissScrollView from '@/components/KeyboardDismissScrollView';
import { useTheme } from '@/contexts/ThemeContext';
import { buildAuthHref, buildPlanChooserHref, parseAuthRedirect } from '@/lib/authRedirect';
import type { AuthJourneyMode } from '@/lib/authLocalState';
import { navigateAfterSignIn } from '@/lib/postAuthNavigation';

const catLightImage =
  require('../../assets/images/splash-light.png') as ImageSourcePropType;
const catDarkImage =
  require('../../assets/images/splash-dark.png') as ImageSourcePropType;

export default function SignInScreen() {
  const { colors, colorScheme, spacing } = useTheme();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const resolvedRedirect = parseAuthRedirect(redirect);
  const catImage = colorScheme === 'dark' ? catDarkImage : catLightImage;

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  const handleSwitchMode = (mode: AuthJourneyMode) => {
    if (mode === 'sign-up') {
      router.replace(buildPlanChooserHref(resolvedRedirect));
      return;
    }
    router.replace(buildAuthHref('sign-in', resolvedRedirect));
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.topHeader,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleGoBack}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: colors.surface,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialIcons color={colors.accent} name="chevron-left" size={24} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <KeyboardDismissScrollView
          contentContainerStyle={[styles.container, { padding: spacing.lg }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.journeyWrap}>
            <AuthJourney
              labelBackgroundColor={colors.bg}
              mode="sign-in"
              onAuthenticated={() => navigateAfterSignIn(resolvedRedirect)}
              onSwitchMode={handleSwitchMode}
            />
          </View>

          <View style={styles.catWrap}>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={catImage}
              style={styles.catImage}
            />
          </View>
        </KeyboardDismissScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  topHeader: {
    alignItems: 'flex-start',
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 22,
    flexShrink: 0,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  journeyWrap: {
    alignItems: 'center',
    width: '100%',
  },
  catWrap: {
    alignItems: 'center',
    marginTop: 24,
  },
  catImage: {
    height: 160,
    width: 160,
  },
});
