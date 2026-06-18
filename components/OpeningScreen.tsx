import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import KeyboardDismissScrollView from '@/components/KeyboardDismissScrollView';
import ThemedTextInput from '@/components/ThemedTextInput';
import { getAuthErrorMessage, useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { APP_NAME } from '@/lib/appName';
import { buildAuthHref } from '@/lib/authRedirect';
import { buttonLabelStyle, buttonLayoutStyle } from '@/lib/buttonStyles';
import { getPendingInviteListId } from '@/lib/pendingInvite';
import { navigateAfterSignIn } from '@/lib/postAuthNavigation';
import { CONTENT_MAX_WIDTH } from '@/lib/slideTransition';
import { OPENING_WELCOME_MS } from '@/lib/splash';

const openingLightImage =
  require('../assets/images/splash-light.png') as ImageSourcePropType;
const openingDarkImage =
  require('../assets/images/splash-dark.png') as ImageSourcePropType;

const OPENING_IMAGE_ASPECT_RATIO = 1024 / 1024;
const OPENING_IMAGE_WIDTH_SCALE = 0.8;
const ACCENT_COLOR = '#C4785A';
const SURFACE_COLOR = '#FFFFFF';

type OpeningScreenProps = {
  fontsLoaded: boolean;
  onComplete: () => void;
};

function getWelcomeName(displayName: string | null | undefined, email: string | null | undefined) {
  const trimmedName = displayName?.trim();
  if (trimmedName) {
    return trimmedName;
  }

  const trimmedEmail = email?.trim();
  if (trimmedEmail) {
    return trimmedEmail.split('@')[0] ?? 'there';
  }

  return 'there';
}

export default function OpeningScreen({ fontsLoaded, onComplete }: OpeningScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const layoutWidth = Math.min(windowWidth, CONTENT_MAX_WIDTH);
  const { user, loading, signIn } = useAuth();
  const { colors, colorScheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !user || !fontsLoaded) {
      return;
    }

    const timer = setTimeout(onComplete, OPENING_WELCOME_MS);
    return () => clearTimeout(timer);
  }, [fontsLoaded, loading, onComplete, user]);

  const handleSignIn = useCallback(async () => {
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
      await navigateAfterSignIn();
      onComplete();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }, [email, onComplete, password, signIn]);

  const handleSkipLogin = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleCreateAccount = useCallback(() => {
    onComplete();
    void getPendingInviteListId().then((pendingListId) => {
      router.push(
        buildAuthHref(
          'sign-up',
          pendingListId ? `/join/${pendingListId}` : undefined,
        ),
      );
    });
  }, [onComplete]);

  const welcomeName = getWelcomeName(user?.displayName, user?.email);
  const showWelcome = !loading && !!user;
  const showLogin = !loading && !user;
  const showLoading = loading || !fontsLoaded;
  const openingImage = colorScheme === 'dark' ? openingDarkImage : openingLightImage;

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.bg, height: windowHeight, width: windowWidth },
      ]}
    >
      <View style={[styles.frame, { width: layoutWidth }]}>
        <View
          style={[
            styles.imageContainer,
            {
              bottom: 0,
              width: layoutWidth,
            },
          ]}
        >
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={openingImage}
            style={[styles.openingImage, { width: layoutWidth * OPENING_IMAGE_WIDTH_SCALE }]}
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.content, { paddingTop: insets.top + 48 }]}
        >
          <KeyboardDismissScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
        {showLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={ACCENT_COLOR} size="large" />
          </View>
        ) : null}

        {showWelcome ? (
          <View style={styles.welcomeContainer}>
            <Text style={[styles.welcomeBack, { color: colors.text }]}>Welcome back,</Text>
            <Text style={[styles.welcomeName, { color: colors.text }]}>{welcomeName}</Text>
          </View>
        ) : null}

        {showLogin ? (
          <View style={styles.loginContainer}>
            <Text style={[styles.loginTitle, { color: colors.text }]}>Welcome to {APP_NAME}</Text>
            <Text style={[styles.loginSubtitle, { color: colors.textSecondary }]}>
              Sign in to sync and share your lists, or continue without an account.
            </Text>

            <View style={styles.form}>
              <ThemedTextInput
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!submitting}
                keyboardType="email-address"
                label="Email"
                labelBackgroundColor={colors.bg}
                onChangeText={setEmail}
                placeholder="you@example.com"
                textContentType="emailAddress"
                value={email}
              />

              <ThemedTextInput
                accessibilityLabel="Password"
                autoComplete="password"
                editable={!submitting}
                label="Password"
                labelBackgroundColor={colors.bg}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry
                textContentType="password"
                value={password}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                disabled={submitting}
                onPress={handleSignIn}
                style={({ pressed }) => [
                  styles.primaryButton,
                  buttonLayoutStyle,
                  { opacity: pressed || submitting ? 0.85 : 1 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={SURFACE_COLOR} />
                ) : (
                  <Text style={[buttonLabelStyle(16), { color: SURFACE_COLOR }]}>Sign in</Text>
                )}
              </Pressable>

              <Pressable
                disabled={submitting}
                onPress={handleSkipLogin}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  buttonLayoutStyle,
                  { opacity: pressed || submitting ? 0.7 : 1 },
                ]}
              >
                <Text style={[buttonLabelStyle(16), { color: colors.text }]}>Skip Sign-in</Text>
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>New to {APP_NAME}? </Text>
              <Pressable
                accessibilityRole="link"
                disabled={submitting}
                onPress={handleCreateAccount}
              >
                <Text style={[styles.footerLink, { color: colors.accent }]}>Create an account</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        </KeyboardDismissScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  frame: {
    flex: 1,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  imageContainer: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
  },
  openingImage: {
    aspectRatio: OPENING_IMAGE_ASPECT_RATIO,
    height: undefined,
    width: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  welcomeBack: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
  },
  welcomeName: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 52,
    lineHeight: 60,
    marginTop: 4,
    textAlign: 'center',
  },
  loginContainer: {
    maxWidth: 400,
    width: '100%',
  },
  loginTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 8,
    textAlign: 'center',
  },
  loginSubtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  error: {
    color: ACCENT_COLOR,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: ACCENT_COLOR,
    borderRadius: 14,
    marginTop: 8,
    minHeight: 52,
  },
  secondaryButton: {
    minHeight: 44,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
  },
  footerLink: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
  },
});
