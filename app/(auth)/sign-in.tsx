import { MaterialIcons } from '@expo/vector-icons';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import KeyboardDismissScrollView from '@/components/KeyboardDismissScrollView';
import ThemedTextInput from '@/components/ThemedTextInput';
import { getAuthErrorMessage, useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { APP_NAME } from '@/lib/appName';
import { buttonLabelStyle, buttonLayoutStyle } from '@/lib/buttonStyles';

function navigateAfterAuth(redirect?: string) {
  router.replace(
    typeof redirect === 'string' && redirect.startsWith('/')
      ? (redirect as '/')
      : '/',
  );
}

export default function SignInScreen() {
  const { colors, radii, spacing } = useTheme();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const resolvedRedirect =
    typeof redirect === 'string' && redirect.startsWith('/') ? redirect : undefined;
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
      navigateAfterAuth(resolvedRedirect);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
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
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Welcome to {APP_NAME}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Sign in to sync your lists and share with others
            </Text>
          </View>

          <View style={styles.form}>
            <ThemedTextInput
              accessibilityLabel="Email"
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

            <ThemedTextInput
              accessibilityLabel="Password"
              autoComplete="password"
              editable={!submitting}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              textContentType="password"
              value={password}
            />

            {error ? (
              <Text style={[styles.error, { color: colors.accent }]}>
                {error}
              </Text>
            ) : null}

            <Pressable
              disabled={submitting}
              onPress={handleSignIn}
              style={({ pressed }) => [
                styles.button,
                buttonLayoutStyle,
                {
                  backgroundColor: colors.accent,
                  borderRadius: radii.item,
                  marginTop: spacing.md,
                  opacity: pressed || submitting ? 0.85 : 1,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={[buttonLabelStyle(16), { color: colors.surface }]}>
                  Sign in
                </Text>
              )}
            </Pressable>
          </View>

          <View style={[styles.footer, { marginTop: spacing.xl }]}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              New to {APP_NAME}?{' '}
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable disabled={submitting}>
                <Text style={[styles.link, { color: colors.accent }]}>
                  Create an account
                </Text>
              </Pressable>
            </Link>
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  error: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    minHeight: 52,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
  },
  link: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
  },
});
