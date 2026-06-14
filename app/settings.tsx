import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useChildSlideTransition } from '@/hooks/useSlideTransition';
import type { ThemePreference } from '@/lib/theme';

const THEME_OPTION_ICON_SIZE = 18;

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
}[] = [
  { value: 'system', label: 'System', icon: 'smartphone' },
  { value: 'light', label: 'Light', icon: 'sunny' },
  { value: 'dark', label: 'Dark', icon: 'nights-stay' },
];

export default function SettingsScreen() {
  const { colors, radii, spacing, preference, setPreference } = useTheme();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { animatedStyle, goBack, isEnabled: slideTransitionEnabled } =
    useChildSlideTransition();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleClose = () => {
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
          onPress={handleClose}
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
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { padding: spacing.lg, gap: spacing.lg }]}
      >
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.md,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          <View style={[styles.themeRow, { gap: spacing.sm, marginTop: spacing.sm }]}>
            {THEME_OPTIONS.map((option) => {
              const selected = preference === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setPreference(option.value)}
                  style={({ pressed }) => [
                    styles.themeOption,
                    {
                      backgroundColor: selected ? colors.accentSoft : colors.surfaceMuted,
                      borderColor: selected ? colors.accent : colors.border,
                      borderRadius: radii.item,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <MaterialIcons
                    color={selected ? colors.text : colors.textSecondary}
                    name={option.icon}
                    size={THEME_OPTION_ICON_SIZE}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: selected ? colors.text : colors.textSecondary },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.md,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          <Text
            style={[
              styles.sectionBody,
              { color: colors.textSecondary, marginTop: spacing.sm },
            ]}
          >
            Your lists are saved on this device. Create an account to sync across devices
            and share lists with others.
          </Text>

          {user ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <Text style={[styles.accountLabel, { color: colors.textSecondary }]}>
                Signed in as
              </Text>
              <Text style={[styles.accountEmail, { color: colors.text }]}>
                {user.displayName || user.email}
              </Text>
              {user.displayName && user.email ? (
                <Text style={[styles.accountEmail, { color: colors.textSecondary }]}>
                  {user.email}
                </Text>
              ) : null}

              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    borderColor: colors.border,
                    borderRadius: radii.item,
                    marginTop: spacing.sm,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.actionButtonText, { color: colors.text }]}>
                  Sign out
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.accountActions, { gap: spacing.sm, marginTop: spacing.md }]}>
              <Pressable
                onPress={() => router.push('/(auth)/sign-in')}
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    backgroundColor: colors.accent,
                    borderRadius: radii.item,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.actionButtonText, { color: colors.surface }]}>
                  Sign in
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(auth)/sign-up')}
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    borderColor: colors.border,
                    borderRadius: radii.item,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.actionButtonText, { color: colors.text }]}>
                  Create account
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
      </View>
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
  container: {
    flexGrow: 1,
  },
  section: {
    borderWidth: 1,
    gap: 4,
  },
  sectionTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
  },
  sectionBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  themeRow: {
    flexDirection: 'row',
  },
  themeOption: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  themeOptionText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
  },
  accountLabel: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
  },
  accountEmail: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  accountActions: {},
  actionButton: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
  },
});
