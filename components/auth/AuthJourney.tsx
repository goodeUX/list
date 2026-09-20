import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Button from '@/components/Button';
import SocialAuthButtons from '@/components/auth/SocialAuthButtons';
import ThemedTextInput from '@/components/ThemedTextInput';
import {
  getAuthErrorMessage,
  isEmailTakenError,
  useAuth,
} from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { APP_NAME } from '@/lib/appName';
import {
  getLastAccountHint,
  type AuthJourneyMode,
} from '@/lib/authLocalState';
import {
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
} from '@/lib/socialAuth';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

type AuthJourneyProps = {
  mode: AuthJourneyMode;
  onSwitchMode: (mode: AuthJourneyMode) => void;
  onAuthenticated: () => void | Promise<void>;
  onSkip?: () => void;
  labelBackgroundColor?: string;
};

type JourneyStep = 'email' | 'details';
type BusyAction = 'continue' | 'submit' | 'google' | 'apple' | 'reset' | null;

function firstNameOf(displayName: string | undefined): string | undefined {
  const first = displayName?.trim().split(/\s+/)[0];
  return first || undefined;
}

export default function AuthJourney({
  mode,
  onSwitchMode,
  onAuthenticated,
  onSkip,
  labelBackgroundColor,
}: AuthJourneyProps) {
  const { colors, space, typography } = useTheme();
  const {
    signIn,
    signUp,
    isEmailRegistered,
    signInWithGoogle,
    signInWithApple,
    resetPassword,
  } = useAuth();

  const [step, setStep] = useState<JourneyStep>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [resetSent, setResetSent] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string | undefined>();
  const [showApple, setShowApple] = useState(false);

  const showGoogle = isGoogleSignInAvailable();
  const isSignUp = mode === 'sign-up';
  const disabled = busy !== null;

  useEffect(() => {
    let active = true;

    void getLastAccountHint().then((hint) => {
      if (!active || !hint) {
        return;
      }

      setWelcomeName(firstNameOf(hint.displayName));
      if (hint.email) {
        setEmail((current) => current || hint.email!);
      }
    });

    void isAppleSignInAvailable().then((available) => {
      if (active) {
        setShowApple(available);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setStep('email');
    setName('');
    setPassword('');
    setError(null);
    setResetSent(false);
  }, [mode]);

  const title = isSignUp
    ? `Join ${APP_NAME}`
    : welcomeName
      ? `Welcome back, ${welcomeName}`
      : 'Welcome back';
  const subtitle = isSignUp
    ? 'Sign up for free to sync and share your lists'
    : 'Log in to get back to your lists';

  const handleContinue = async () => {
    setError(null);

    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    // On signup, block early if this email already has an account. This is a
    // best-effort probe; account creation still enforces uniqueness as a
    // guaranteed fallback (see handleSubmitDetails).
    if (isSignUp) {
      setBusy('continue');
      try {
        if (await isEmailRegistered(trimmedEmail)) {
          setError(getAuthErrorMessage({ code: 'auth/email-already-in-use' }));
          return;
        }
      } finally {
        setBusy(null);
      }
    }

    setResetSent(false);
    setStep('details');
  };

  const handleBackToEmail = () => {
    setError(null);
    setResetSent(false);
    setStep('email');
  };

  const handleSubmitDetails = async () => {
    setError(null);
    setResetSent(false);

    if (isSignUp && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }

    setBusy('submit');
    try {
      if (isSignUp) {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
      await onAuthenticated();
    } catch (err) {
      // If the up-front probe missed it (e.g. enumeration protection), the
      // authoritative rejection lands here — send the user back to the email
      // step so the message shows under the email field.
      if (isSignUp && isEmailTakenError(err)) {
        setStep('email');
      }
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleSocial = async (provider: 'google' | 'apple') => {
    setError(null);
    setBusy(provider);
    try {
      const run = provider === 'google' ? signInWithGoogle : signInWithApple;
      const result = await run();
      if (result === 'success') {
        await onAuthenticated();
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setBusy('reset');
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleSwitchMode = () => {
    setError(null);
    setResetSent(false);
    setPassword('');
    setStep('email');
    onSwitchMode(isSignUp ? 'sign-in' : 'sign-up');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[typography.h1, styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[typography.body, styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      </View>

      {step === 'email' ? (
        <View style={styles.form}>
          <ThemedTextInput
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!disabled}
            keyboardType="email-address"
            label="Email"
            labelBackgroundColor={labelBackgroundColor}
            onChangeText={setEmail}
            onSubmitEditing={() => void handleContinue()}
            placeholder="you@example.com"
            returnKeyType="next"
            textContentType="emailAddress"
            value={email}
          />

          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              style={[typography.bodyS, styles.error, { color: colors.primary }]}
            >
              {error}
            </Text>
          ) : null}

          <Button
            disabled={disabled}
            label="Continue"
            loading={busy === 'continue'}
            onPress={() => void handleContinue()}
            style={styles.primaryButton}
            variant="primary"
          />

          {showGoogle || showApple ? (
            <>
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[typography.bodyS, styles.dividerText, { color: colors.textSecondary }]}>
                  or
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              <SocialAuthButtons
                appleBusy={busy === 'apple'}
                disabled={disabled}
                googleBusy={busy === 'google'}
                onApplePress={() => void handleSocial('apple')}
                onGooglePress={() => void handleSocial('google')}
                showApple={showApple}
              />
            </>
          ) : null}
        </View>
      ) : (
        <View style={styles.form}>
          <Pressable
            accessibilityLabel="Use a different email"
            accessibilityRole="button"
            disabled={disabled}
            hitSlop={8}
            onPress={handleBackToEmail}
            style={styles.backRow}
          >
            <MaterialIcons color={colors.textSecondary} name="chevron-left" size={20} />
            <Text style={[typography.label, styles.backRowText, { color: colors.textSecondary }]}>
              {email.trim()}
            </Text>
          </Pressable>

          {isSignUp ? (
            <ThemedTextInput
              accessibilityLabel="Name"
              autoComplete="name"
              editable={!disabled}
              label="Name"
              labelBackgroundColor={labelBackgroundColor}
              onChangeText={setName}
              placeholder="Your name"
              textContentType="name"
              value={name}
            />
          ) : null}

          <ThemedTextInput
            accessibilityLabel="Password"
            autoComplete={isSignUp ? 'new-password' : 'password'}
            autoFocus
            editable={!disabled}
            label="Password"
            labelBackgroundColor={labelBackgroundColor}
            onChangeText={setPassword}
            onSubmitEditing={() => void handleSubmitDetails()}
            placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
            returnKeyType="done"
            secureTextEntry
            textContentType={isSignUp ? 'newPassword' : 'password'}
            value={password}
          />

          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              style={[typography.bodyS, styles.error, { color: colors.primary }]}
            >
              {error}
            </Text>
          ) : null}
          {resetSent ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[typography.bodyS, styles.resetNote, { color: colors.textSecondary }]}
            >
              If an account exists for {email.trim()}, a reset link is on its way.
            </Text>
          ) : null}

          <Button
            disabled={disabled}
            label={isSignUp ? 'Create account' : 'Log in'}
            loading={busy === 'submit'}
            onPress={() => void handleSubmitDetails()}
            style={styles.primaryButton}
            variant="primary"
          />

          {!isSignUp ? (
            <Pressable
              disabled={disabled}
              hitSlop={8}
              onPress={() => void handleForgotPassword()}
              style={styles.forgotButton}
            >
              {busy === 'reset' ? (
                <ActivityIndicator color={colors.textSecondary} size="small" />
              ) : (
                <Text style={[typography.label, styles.link, { color: colors.primary }]}>
                  Forgot password?
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>
      )}

      <View style={[styles.footer, { marginTop: space[6] }]}>
        <Text style={[typography.body, styles.footerText, { color: colors.textSecondary }]}>
          {isSignUp ? 'Already have an account? ' : `New to ${APP_NAME}? `}
        </Text>
        <Pressable accessibilityRole="link" disabled={disabled} onPress={handleSwitchMode}>
          <Text style={[typography.label, styles.link, { color: colors.primary }]}>
            {isSignUp ? 'Log in' : 'Create an account'}
          </Text>
        </Pressable>
      </View>

      {onSkip ? (
        <Button
          disabled={disabled}
          label="Skip for now"
          onPress={onSkip}
          style={styles.skipButton}
          variant="ghost"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: 400,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  backRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 2,
  },
  backRowText: {},
  error: {},
  resetNote: {},
  primaryButton: {},
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {},
  forgotButton: {
    alignItems: 'center',
    minHeight: 24,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {},
  link: {},
  skipButton: {
    marginTop: 12,
  },
});
