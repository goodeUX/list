import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ThemedTextInput from '@/components/ThemedTextInput';
import Button from '@/components/Button';
import { getAuthErrorMessage, useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useChildSlideTransition } from '@/hooks/useSlideTransition';

export default function EditAccountScreen() {
  const { colors, spacing } = useTheme();
  const { user, loading, updateAccount } = useAuth();
  const insets = useSafeAreaInsets();
  const { animatedStyle, goBack, isEnabled: slideTransitionEnabled } =
    useChildSlideTransition({ ready: !loading && Boolean(user) });

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setDisplayName(user.displayName ?? '');
    setEmail(user.email ?? '');
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      goBack();
    }
  }, [goBack, loading, user]);

  if (!user) {
    return null;
  }

  const emailChanging = email.trim() !== (user.email ?? '');
  const passwordChanging = newPassword.trim().length > 0;
  const needsCurrentPassword = emailChanging || passwordChanging;
  const hasPasswordProvider = user.providerData.some(
    (provider) => provider.providerId === 'password',
  );

  const handleSave = async () => {
    setError(null);

    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (passwordChanging) {
      if (!currentPassword) {
        setError('Enter your current password to set a new password.');
        return;
      }

      if (!confirmNewPassword.trim()) {
        setError('Please confirm your new password.');
        return;
      }

      if (newPassword !== confirmNewPassword) {
        setError('New passwords do not match.');
        return;
      }
    }

    if (emailChanging && !passwordChanging && !currentPassword) {
      setError('Enter your current password below to save your new email.');
      return;
    }

    setSubmitting(true);
    try {
      await updateAccount({
        displayName,
        email,
        currentPassword: needsCurrentPassword ? currentPassword : undefined,
        newPassword: passwordChanging ? newPassword : undefined,
      });
      goBack();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Animated.View
      style={[
        styles.screen,
        { backgroundColor: colors.bg },
        slideTransitionEnabled ? animatedStyle : null,
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View
          style={[
            styles.flex,
            {
              paddingBottom: insets.bottom,
              paddingLeft: insets.left,
              paddingRight: insets.right,
              paddingTop: insets.top,
            },
          ]}
        >
          <View
            style={[
              styles.header,
              {
                borderBottomColor: colors.border,
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.md,
                paddingBottom: spacing.md,
              },
            ]}
          >
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={8}
              onPress={goBack}
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

            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: colors.text }]}>Edit account</Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.content, { gap: spacing.md, padding: spacing.lg }]}
            keyboardShouldPersistTaps="handled"
            style={styles.scroll}
          >
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
              <ThemedTextInput
                autoComplete="name"
                editable={!submitting}
                onChangeText={setDisplayName}
                placeholder="Your name"
                textContentType="name"
                value={displayName}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
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
              {emailChanging ? (
                <Text style={[styles.helper, { color: colors.textSecondary }]}>
                  Saving a new email requires your current password below.
                </Text>
              ) : null}
            </View>

            {hasPasswordProvider ? (
              <View
                style={{
                  borderTopColor: colors.border,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  gap: spacing.md,
                  paddingTop: spacing.md,
                }}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Change password
                </Text>
                <Text style={[styles.helper, { color: colors.textSecondary }]}>
                  Enter your current password, then a new password twice.
                </Text>

                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    Current password
                  </Text>
                  <ThemedTextInput
                    autoComplete="current-password"
                    editable={!submitting}
                    onChangeText={setCurrentPassword}
                    placeholder="Your current password"
                    secureTextEntry
                    textContentType="password"
                    value={currentPassword}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    New password
                  </Text>
                  <ThemedTextInput
                    autoComplete="new-password"
                    editable={!submitting}
                    onChangeText={setNewPassword}
                    placeholder="At least 6 characters"
                    secureTextEntry
                    textContentType="newPassword"
                    value={newPassword}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    Confirm new password
                  </Text>
                  <ThemedTextInput
                    autoComplete="new-password"
                    editable={!submitting}
                    onChangeText={setConfirmNewPassword}
                    placeholder="Re-enter new password"
                    secureTextEntry
                    textContentType="newPassword"
                    value={confirmNewPassword}
                  />
                </View>
              </View>
            ) : null}

            {error ? (
              <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.bottomBar,
              {
                borderTopColor: colors.border,
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.md,
                paddingBottom: spacing.lg,
              },
            ]}
          >
            <Button
              icon="save"
              label="Save changes"
              loading={submitting}
              onPress={handleSave}
              variant="primary"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
  },
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 22,
    flexShrink: 0,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  headerSpacer: {
    flexShrink: 0,
    height: 44,
    width: 44,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  field: {
    gap: 6,
  },
  sectionTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
  },
  label: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
  },
  helper: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
