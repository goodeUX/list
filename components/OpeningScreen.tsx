import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import AuthJourney from '@/components/auth/AuthJourney';
import AuthScreenLayout from '@/components/auth/AuthScreenLayout';
import BiometricGate from '@/components/auth/BiometricGate';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { shouldBypassAppLock } from '@/lib/appLock';
import { space } from '@/lib/design';
import {
  getJourneyDefault,
  recordAppUsed,
  type AuthJourneyMode,
} from '@/lib/authLocalState';
import { navigateAfterSignIn } from '@/lib/postAuthNavigation';
import { OPENING_WELCOME_MS } from '@/lib/splash';

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
  const { user, loading } = useAuth();
  const { colors, typography } = useTheme();
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

  return (
    <AuthScreenLayout>
            {showLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} size="large" />
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
                <Text style={[typography.h1, styles.welcomeBack, { color: colors.text }]}>
                  Welcome back,
                </Text>
                <Text style={[typography.display, styles.welcomeName, { color: colors.text }]}>
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
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingTop: space[10],
  },
  welcomeBack: {
    textAlign: 'center',
  },
  welcomeName: {
    marginTop: space[1],
    textAlign: 'center',
  },
});
