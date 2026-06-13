import { Link, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAuthErrorMessage, useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

function navigateAfterAuth() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/');
}

export default function SignInScreen() {
  const { colors, radii, spacing } = useTheme();
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
      navigateAfterAuth();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={[styles.container, { padding: spacing.lg }]}>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={({ pressed }) => [
              styles.closeButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              size={20}
              tintColor={colors.textSecondary}
            />
          </Pressable>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Welcome to List App
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Sign in to sync your lists and share with others
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Email
              </Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!submitting}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.item,
                    color: colors.text,
                  },
                ]}
                textContentType="emailAddress"
                value={email}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Password
              </Text>
              <TextInput
                autoComplete="password"
                editable={!submitting}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.item,
                    color: colors.text,
                  },
                ]}
                textContentType="password"
                value={password}
              />
            </View>

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
                <Text style={[styles.buttonText, { color: colors.surface }]}>
                  Sign in
                </Text>
              )}
            </Pressable>
          </View>

          <View style={[styles.footer, { marginTop: spacing.xl }]}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              New to List App?{' '}
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable disabled={submitting}>
                <Text style={[styles.link, { color: colors.accent }]}>
                  Create an account
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
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
    flex: 1,
    justifyContent: 'center',
  },
  closeButton: {
    alignSelf: 'flex-end',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  error: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
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
