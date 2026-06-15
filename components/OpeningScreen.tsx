import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import KeyboardDismissScrollView from '@/components/KeyboardDismissScrollView';
import ThemedTextInput from '@/components/ThemedTextInput';
import { getAuthErrorMessage, useAuth } from '@/contexts/AuthContext';
import { buttonLabelStyle, buttonLayoutStyle } from '@/lib/buttonStyles';
import { OPENING_WELCOME_MS, SPLASH_BACKGROUND_COLOR } from '@/lib/splash';

const openingDogImage =
  require('../assets/images/opening-dog.png') as ImageSourcePropType;

const { height: windowHeight, width: windowWidth } = Dimensions.get('window');
const OPENING_DOG_ASPECT_RATIO = 902 / 1024;
const OPENING_DOG_WIDTH = windowWidth;
const OPENING_DOG_BOTTOM_BLEED = -48;
const OPENING_DOG_RIGHT_BLEED = -72;
const OPENING_TEXT_COLOR = '#2C2417';
const OPENING_TEXT_MUTED = '#6B5E4F';
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
  const { user, loading, signIn } = useAuth();
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

  const welcomeName = getWelcomeName(user?.displayName, user?.email);
  const showWelcome = !loading && !!user;
  const showLogin = !loading && !user;
  const showLoading = loading || !fontsLoaded;

  return (
    <View style={styles.screen}>
      <View style={styles.dogContainer}>
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={openingDogImage}
          style={styles.dogImage}
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
            <Text style={styles.welcomeBack}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{welcomeName}</Text>
          </View>
        ) : null}

        {showLogin ? (
          <View style={styles.loginContainer}>
            <Text style={styles.loginTitle}>Welcome to List App</Text>
            <Text style={styles.loginSubtitle}>
              Sign in to sync your lists, or continue without an account.
            </Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <ThemedTextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  editable={!submitting}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  textContentType="emailAddress"
                  value={email}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <ThemedTextInput
                  autoComplete="password"
                  editable={!submitting}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  secureTextEntry
                  textContentType="password"
                  value={password}
                />
              </View>

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
                <Text style={[buttonLabelStyle(16), { color: OPENING_TEXT_MUTED }]}>Skip login</Text>
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>New to List App? </Text>
              <Link href="/(auth)/sign-up" asChild>
                <Pressable disabled={submitting}>
                  <Text style={styles.footerLink}>Create an account</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        ) : null}
        </KeyboardDismissScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: SPLASH_BACKGROUND_COLOR,
    height: windowHeight,
    overflow: 'hidden',
    width: windowWidth,
  },
  dogContainer: {
    bottom: OPENING_DOG_BOTTOM_BLEED,
    position: 'absolute',
    right: OPENING_DOG_RIGHT_BLEED,
    width: OPENING_DOG_WIDTH,
  },
  dogImage: {
    aspectRatio: OPENING_DOG_ASPECT_RATIO,
    height: undefined,
    width: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  scrollContent: {
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
    color: OPENING_TEXT_COLOR,
    fontFamily: 'Fraunces_400Regular',
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
  },
  welcomeName: {
    color: OPENING_TEXT_COLOR,
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
    color: OPENING_TEXT_COLOR,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 8,
  },
  loginSubtitle: {
    color: OPENING_TEXT_MUTED,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    color: OPENING_TEXT_MUTED,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
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
    color: OPENING_TEXT_MUTED,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
  },
  footerLink: {
    color: ACCENT_COLOR,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
  },
});
