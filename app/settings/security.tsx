import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '@/components/Button';
import ThemedTextInput from '@/components/ThemedTextInput';
import { getAuthErrorMessage, useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppLock } from '@/hooks/useAppLock';
import { useChildSlideTransition } from '@/hooks/useSlideTransition';

export default function SecurityScreen() {
  const { colors, spacing } = useTheme();
  const { user, loading, updateAccount } = useAuth();
  const appLock = useAppLock();
  const insets = useSafeAreaInsets();
  const { animatedStyle, goBack, isEnabled: slideTransitionEnabled } =
    useChildSlideTransition({ ready: !loading && Boolean(user) });

  const [appLockBusy, setAppLockBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      goBack();
    }
  }, [goBack, loading, user]);

  if (!user) {
    return null;
  }

  // Google- and Apple-only accounts have no password of ours to change.
  const hasPasswordProvider = user.providerData.some(
    (provider) => provider.providerId === 'password',
  );

  const handleAppLockToggle = async (next: boolean) => {
    setAppLockBusy(true);
    try {
      await appLock.setEnabled(next);
    } finally {
      setAppLockBusy(false);
    }
  };

  const handleSave = async () => {
    setError(null);

    if (!newPassword.trim()) {
      setError('Enter a new password.');
      return;
    }

    if (!currentPassword) {
      setError('Enter your current password to set a new password.');
      return;
    }

    if (!confirmNewPassword) {
      setError('Please confirm your new password.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await updateAccount({
        displayName: user.displayName ?? '',
        email: user.email ?? '',
        currentPassword,
        newPassword,
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

            <Text style={[styles.title, { color: colors.text }]}>Security</Text>

            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.content, { gap: spacing.md, padding: spacing.lg }]}
            keyboardShouldPersistTaps="handled"
            style={styles.scroll}
          >
            {appLock.capability === 'ready' ? (
              <View style={styles.appLockRow}>
                <View style={styles.appLockLabels}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Fingerprint / Face ID
                  </Text>
                  <Text style={[styles.helper, { color: colors.textSecondary }]}>
                    Require fingerprint / Face ID to open List Kitty
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="App lock"
                  disabled={appLock.loading || appLockBusy}
                  onValueChange={(next) => void handleAppLockToggle(next)}
                  thumbColor={appLock.enabled ? colors.accent : colors.textSecondary}
                  trackColor={{ false: colors.border, true: colors.accentSoft }}
                  value={appLock.enabled}
                />
              </View>
            ) : appLock.capability === 'unsupported' ? null : (
              <Text style={[styles.helper, { color: colors.textSecondary }]}>
                Set up fingerprint or face unlock in your device settings to use App lock.
              </Text>
            )}

            {hasPasswordProvider ? (
              <View
                style={{
                  borderTopColor: colors.border,
                  borderTopWidth:
                    appLock.capability === 'unsupported' ? 0 : StyleSheet.hairlineWidth,
                  gap: spacing.md,
                  paddingTop:
                    appLock.capability === 'unsupported' ? 0 : spacing.md,
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

          {hasPasswordProvider ? (
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
                label="Save changes"
                loading={submitting}
                onPress={handleSave}
                variant="primary"
              />
            </View>
          ) : null}
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
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerSpacer: {
    height: 44,
    marginLeft: 'auto',
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
  appLockRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  appLockLabels: {
    flex: 1,
    gap: 2,
    minWidth: 0,
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
