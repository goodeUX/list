import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { authenticateForAppLock } from '@/lib/appLock';
import { buttonLabelStyle, buttonLayoutStyle } from '@/lib/buttonStyles';

type BiometricGateProps = {
  onUnlocked: () => void;
  onSignedOut: () => void;
};

export default function BiometricGate({ onUnlocked, onSignedOut }: BiometricGateProps) {
  const { colors, radii } = useTheme();
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
      <Text style={[styles.welcomeBack, { color: colors.text }]}>Welcome back,</Text>
      <Text style={[styles.welcomeName, { color: colors.text }]}>{welcomeName}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy, busy: checking }}
        disabled={busy}
        onPress={() => void attemptUnlock()}
        style={({ pressed }) => [
          styles.unlockButton,
          buttonLayoutStyle,
          {
            backgroundColor: colors.accent,
            borderRadius: radii.item,
            opacity: pressed || busy ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[buttonLabelStyle(16), { color: colors.surface }]}>Unlock</Text>
      </Pressable>

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
        <Text style={[styles.signOutText, { color: colors.textSecondary }]}>
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
    paddingTop: 40,
    width: '100%',
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
  unlockButton: {
    marginTop: 32,
    minHeight: 52,
    width: '100%',
  },
  signOutButton: {
    marginTop: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  signOutText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
