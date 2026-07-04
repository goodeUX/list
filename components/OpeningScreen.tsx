import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthJourney from '@/components/auth/AuthJourney';
import BiometricGate from '@/components/auth/BiometricGate';
import KeyboardDismissScrollView from '@/components/KeyboardDismissScrollView';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { shouldBypassAppLock } from '@/lib/appLock';
import {
  getJourneyDefault,
  recordAppUsed,
  type AuthJourneyMode,
} from '@/lib/authLocalState';
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

type OpeningScreenProps = {
  fontsLoaded: boolean;
  onComplete: () => void;
};

function getWelcomeName(
  displayName: string | null | undefined,
  email: string | null | undefined,
) {
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
  const { user, loading } = useAuth();
  const { colors, colorScheme } = useTheme();
  const [journeyMode, setJourneyMode] = useState<AuthJourneyMode | null>(null);
  const [lockRequired, setLockRequired] = useState<boolean | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    let active = true;

    void getJourneyDefault().then((mode) => {
      if (active) {
        setJourneyMode(mode);
      }
    });
    void shouldBypassAppLock().then((bypass) => {
      if (active) {
        setLockRequired(!bypass);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  // No persisted session at mount → any sign-in during this mount is a fresh
  // authentication; the gate protects persisted sessions only.
  useEffect(() => {
    if (!loading && !user) {
      setUnlocked(true);
    }
  }, [loading, user]);

  // Gate applies to persisted sessions found at mount; unlocked latches when the mount resolves signed-out.
  const gateActive = Boolean(user) && lockRequired === true && !unlocked;

  useEffect(() => {
    if (loading || !user || !fontsLoaded || lockRequired === null || gateActive) {
      return;
    }

    const timer = setTimeout(onComplete, OPENING_WELCOME_MS);
    return () => clearTimeout(timer);
  }, [fontsLoaded, gateActive, loading, lockRequired, onComplete, user]);

  const handleUnlocked = useCallback(() => {
    setUnlocked(true);
    onComplete();
  }, [onComplete]);

  const handleGateSignOut = useCallback(() => {
    setLockRequired(false);
    setJourneyMode('sign-in');
  }, []);

  const handleSkip = useCallback(() => {
    void recordAppUsed();
    onComplete();
  }, [onComplete]);

  const handleAuthenticated = useCallback(async () => {
    // A journey sign-in is itself an authentication — satisfies the gate for this mount.
    setUnlocked(true);
    await navigateAfterSignIn();
    // Parent onComplete is idempotent; the welcome timer may also fire it.
    onComplete();
  }, [onComplete]);

  const welcomeName = getWelcomeName(user?.displayName, user?.email);
  const stateReady = !loading && lockRequired !== null && journeyMode !== null;
  const showLoading = loading || !fontsLoaded || !stateReady;
  const showGate = stateReady && gateActive;
  const showWelcome = stateReady && !!user && !gateActive;
  const showJourney = stateReady && !user;
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

            {showGate ? (
              <BiometricGate
                onSignedOut={handleGateSignOut}
                onUnlocked={handleUnlocked}
              />
            ) : null}

            {showWelcome ? (
              <View style={styles.welcomeContainer}>
                <Text style={[styles.welcomeBack, { color: colors.text }]}>
                  Welcome back,
                </Text>
                <Text style={[styles.welcomeName, { color: colors.text }]}>
                  {welcomeName}
                </Text>
              </View>
            ) : null}

            {showJourney && journeyMode ? (
              <AuthJourney
                labelBackgroundColor={colors.bg}
                mode={journeyMode}
                onAuthenticated={handleAuthenticated}
                onSkip={handleSkip}
                onSwitchMode={setJourneyMode}
              />
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
});
