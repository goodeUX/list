import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Button from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { authenticateForAppLock } from '@/lib/appLock';
import { space } from '@/lib/design';

type BiometricGateProps = {
  onUnlocked: () => void;
  onSignedOut: () => void;
};

export default function BiometricGate({ onUnlocked, onSignedOut }: BiometricGateProps) {
  const { colors, typography } = useTheme();
  const { user, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const attemptedRef = useRef(false);

  const busy = checking || signingOut;

  const welcomeName =
    user?.displayName?.trim() || user?.email?.trim()?.split('@')[0] || 'there';

  const attemptUnlock = useCallback(async () => {
    setChecking(true);
    try {
      if (await authenticateForAppLock()) {
        onUnlocked();
      }
    } finally {
      setChecking(false);
    }
  }, [onUnlocked]);

  useEffect(() => {
    if (!attemptedRef.current) {
      attemptedRef.current = true;
      void attemptUnlock();
    }
  }, [attemptUnlock]);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      onSignedOut();
    } catch (error) {
      // Session still active — stay on the gate.
      console.error('Sign out from gate failed', error);
    } finally {
      setSigningOut(false);
    }
  }, [onSignedOut, signOut]);

  return (
    <View style={styles.container}>
      <Text style={[typography.h1, styles.welcomeBack, { color: colors.text }]}>Welcome back,</Text>
      <Text style={[typography.display, styles.welcomeName, { color: colors.text }]}>{welcomeName}</Text>

      <Button
        accessibilityLabel="Unlock"
        disabled={busy}
        label="Unlock"
        loading={checking}
        onPress={() => void attemptUnlock()}
        style={styles.unlockButton}
        variant="primary"
      />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy, busy: signingOut }}
        disabled={busy}
        onPress={() => void handleSignOut()}
        style={({ pressed }) => [
          styles.signOutButton,
          { opacity: pressed || busy ? 0.7 : 1 },
        ]}
      >
        <Text style={[typography.label, styles.signOutText, { color: colors.textSecondary }]}>
          Not you? Sign out
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    maxWidth: 400,
    paddingTop: space[10],
    width: '100%',
  },
  welcomeBack: {
    textAlign: 'center',
  },
  welcomeName: {
    marginTop: space[1],
    textAlign: 'center',
  },
  unlockButton: {
    marginTop: space[8],
  },
  signOutButton: {
    marginTop: space[4],
    minHeight: 44,
    justifyContent: 'center',
  },
  signOutText: {
    textAlign: 'center',
  },
});
