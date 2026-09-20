import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

import Button from '@/components/Button';
import ThemedTextInput from '@/components/ThemedTextInput';
import UserAvatar from '@/components/UserAvatar';
import { getAuthErrorMessage, useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useChildSlideTransition } from '@/hooks/useSlideTransition';
import { radius, space } from '@/lib/design';

const AVATAR_SIZE = 96;

export default function ProfileScreen() {
  const { colors, typography } = useTheme();
  const { user, loading, signOut, updateAccount } = useAuth();
  const insets = useSafeAreaInsets();
  const { animatedStyle, goBack, isEnabled: slideTransitionEnabled } =
    useChildSlideTransition({ ready: !loading && Boolean(user) });

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The name saves itself, so the latest typed value and the last persisted
  // one both have to be readable from outside a render.
  const typedNameRef = useRef(displayName);
  const savedNameRef = useRef(user?.displayName ?? '');
  const signingOutRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      goBack();
    }
  }, [goBack, loading, user]);

  // Takes the name the account actually has, without clobbering an edit in
  // progress: after our own save this already matches and returns early.
  useEffect(() => {
    const next = user?.displayName ?? '';
    if (next === savedNameRef.current) {
      return;
    }

    savedNameRef.current = next;
    typedNameRef.current = next;
    setDisplayName(next);
  }, [user]);

  const saveDisplayName = useCallback(async () => {
    const trimmed = typedNameRef.current.trim();

    // A display name is required, so an empty field is an abandoned edit
    // rather than a change to save.
    if (!trimmed) {
      typedNameRef.current = savedNameRef.current;
      setDisplayName(savedNameRef.current);
      return;
    }

    if (trimmed === savedNameRef.current) {
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await updateAccount({ displayName: trimmed, email: user?.email ?? '' });
      savedNameRef.current = trimmed;
    } catch (err) {
      // Keeps the typed text: it is the only copy of what they wrote.
      setError(getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [updateAccount, user?.email]);

  // A hardware back press can unmount the field before it blurs, so catch the
  // pending edit on the way out. Read through a ref so this runs once.
  const saveDisplayNameRef = useRef(saveDisplayName);
  saveDisplayNameRef.current = saveDisplayName;

  useEffect(
    () => () => {
      if (!signingOutRef.current) {
        void saveDisplayNameRef.current();
      }
    },
    [],
  );

  if (!user) {
    return null;
  }

  const handleChangeName = (next: string) => {
    typedNameRef.current = next;
    setDisplayName(next);
  };

  const handleSignOut = async () => {
    signingOutRef.current = true;
    await signOut();
    if (router.canGoBack()) {
      goBack();
      return;
    }
    router.replace('/');
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

            <Text style={[typography.h2, styles.title, { color: colors.text }]}>Profile</Text>

            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.content, { gap: space[4], padding: space[6] }]}
            keyboardShouldPersistTaps="handled"
            style={styles.scroll}
          >
            <View style={styles.avatarRow}>
              <UserAvatar
                label={user.displayName || user.email || ''}
                photoURL={user.photoURL}
                size={AVATAR_SIZE}
              />
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={[typography.label, styles.label, { color: colors.textSecondary }]}>
                  Display name
                </Text>
                {saving ? <ActivityIndicator color={colors.textSecondary} size="small" /> : null}
              </View>
              <ThemedTextInput
                autoComplete="name"
                onBlur={() => void saveDisplayName()}
                onChangeText={handleChangeName}
                placeholder="Your name"
                textContentType="name"
                value={displayName}
              />
            </View>

            <View style={styles.field}>
              <Text style={[typography.label, styles.label, { color: colors.textSecondary }]}>
                Email
              </Text>
              <View
                style={[
                  styles.readOnlyBox,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: space[4],
                  },
                ]}
              >
                <Text style={[typography.body, styles.readOnlyText, { color: colors.textSecondary }]}>
                  {user.email ?? ''}
                </Text>
              </View>
            </View>

            {error ? (
              <Text style={[typography.bodyS, styles.error, { color: colors.primary }]}>{error}</Text>
            ) : null}

            <Button
              icon="logout"
              label="Sign out"
              onPress={handleSignOut}
              variant="surface"
            />
          </ScrollView>
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
  avatarRow: {
    alignItems: 'center',
  },
  field: {
    gap: space[2],
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[2],
  },
  label: {},
  readOnlyBox: {
    borderWidth: 1,
  },
  readOnlyText: {},
  error: {},
});
