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
import { absoluteFill } from '@/lib/absoluteFill';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ToggleSwitch from '@/components/ToggleSwitch';
import Button from '@/components/Button';
import ThemedTextInput, { inputLabelStyle } from '@/components/ThemedTextInput';
import { getAuthErrorMessage, useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppLock } from '@/hooks/useAppLock';
import { useChildSlideTransition } from '@/hooks/useSlideTransition';
import { radius, space } from '@/lib/design';

export default function SecurityScreen() {
  const { colors, typography } = useTheme();
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
                paddingHorizontal: space[6],
                paddingTop: space[4],
                paddingBottom: space[4],
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
              <MaterialIcons color={colors.primary} name="chevron-left" size={24} />
            </Pressable>

            <Text style={[typography.h2, styles.title, { color: colors.text }]}>Security</Text>

            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.content, { gap: space[4], padding: space[6] }]}
            keyboardShouldPersistTaps="handled"
            style={styles.scroll}
          >
            {appLock.capability === 'ready' ? (
              <View style={styles.appLockRow}>
                <View style={styles.appLockLabels}>
                  <Text style={[typography.title, styles.sectionTitle, { color: colors.text }]}>
                    Fingerprint / Face ID
                  </Text>
                  <Text style={[typography.bodyS, styles.helper, { color: colors.textSecondary }]}>
                    Require fingerprint / Face ID to open List Kitty
                  </Text>
                </View>
                <ToggleSwitch
                  accessibilityLabel="App lock"
                  disabled={appLock.loading || appLockBusy}
                  onValueChange={(next) => void handleAppLockToggle(next)}
                  value={appLock.enabled}
                />
              </View>
            ) : appLock.capability === 'unsupported' ? null : (
              <Text style={[typography.bodyS, styles.helper, { color: colors.textSecondary }]}>
                Set up fingerprint or face unlock in your device settings to use App lock.
              </Text>
            )}

            {hasPasswordProvider ? (
              <View
                style={{
                  borderTopColor: colors.border,
                  borderTopWidth:
                    appLock.capability === 'unsupported' ? 0 : StyleSheet.hairlineWidth,
                  gap: space[4],
                  paddingTop:
                    appLock.capability === 'unsupported' ? 0 : space[4],
                }}
              >
                <Text style={[typography.title, styles.sectionTitle, { color: colors.text }]}>
                  Change password
                </Text>
                <Text style={[typography.bodyS, styles.helper, { color: colors.textSecondary }]}>
                  Enter your current password, then a new password twice.
                </Text>

                <View style={styles.field}>
                  <Text style={[inputLabelStyle, { color: colors.textSecondary }]}>
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
                  <Text style={[inputLabelStyle, { color: colors.textSecondary }]}>
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
                  <Text style={[inputLabelStyle, { color: colors.textSecondary }]}>
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
              <Text style={[typography.bodyS, styles.error, { color: colors.primary }]}>{error}</Text>
            ) : null}
          </ScrollView>

          {hasPasswordProvider ? (
            <View
              style={[
                styles.bottomBar,
                {
                  borderTopColor: colors.border,
                  paddingHorizontal: space[6],
                  paddingTop: space[4],
                  paddingBottom: space[6],
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
    ...absoluteFill,
  },
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space[3],
  },
  backButton: {
    alignItems: 'center',
    borderRadius: radius.xl,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerSpacer: {
    height: 44,
    marginLeft: 'auto',
    width: 44,
  },
  title: {},
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  appLockRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[3],
  },
  appLockLabels: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  field: {
    gap: space[2],
  },
  sectionTitle: {},
  helper: {},
  error: {},
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
