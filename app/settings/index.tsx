import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button';
import MaterialSymbol from '@/components/MaterialSymbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useChildSlideTransition } from '@/hooks/useSlideTransition';
import type { ThemePreference } from '@/lib/theme';
import { buttonLabelStyle, buttonLayoutStyle } from '@/lib/buttonStyles';

const THEME_OPTION_ICON_SIZE = 18;
const introLightImage =
  require('../../assets/images/intro-light.png') as ImageSourcePropType;
const introDarkImage =
  require('../../assets/images/intro-dark.png') as ImageSourcePropType;

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
  const { colors, colorScheme, radii, spacing, preference, setPreference } = useTheme();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { animatedStyle, goBack, isEnabled: slideTransitionEnabled } =
    useChildSlideTransition();

  const handleSignOut = async () => {
    await signOut();
    if (router.canGoBack()) {
      goBack();
      return;
    }
    router.replace('/');
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      goBack();
      return;
    }
    router.replace('/');
  };

  const accountLabel = user?.displayName || user?.email || '';
  const accountInitial = accountLabel.trim().charAt(0).toUpperCase() || '?';
  const introImage = colorScheme === 'dark' ? introDarkImage : introLightImage;

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

        <Text style={[styles.title, { color: colors.text, flex: 1, minWidth: 0 }]}>
          Settings
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
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

          {user ? (
            <View style={[styles.accountRow, { gap: spacing.sm, marginTop: spacing.sm }]}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.accentSoft },
                ]}
              >
                <Text style={[styles.avatarText, { color: colors.text }]}>
                  {accountInitial}
                </Text>
              </View>
              <Text style={[styles.accountEmail, { color: colors.text, flex: 1 }]}>
                {accountLabel}
              </Text>
              <Pressable
                accessibilityLabel="Edit account"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => router.push('/settings/edit-account')}
                style={({ pressed }) => [
                  styles.editButton,
                  {
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <MaterialSymbol color={colors.accent} filled name="person_edit" size={22} />
              </Pressable>
            </View>
          ) : (
            <View style={[styles.accountActions, { gap: spacing.sm, marginTop: spacing.sm }]}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(auth)/sign-in',
                    params: { redirect: '/' },
                  })
                }
                style={({ pressed }) => [
                  styles.actionButton,
                  buttonLayoutStyle,
                  {
                    backgroundColor: colors.accent,
                    borderRadius: radii.item,
                    borderWidth: 0,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[buttonLabelStyle(16), { color: colors.surface }]}>
                  Sign in
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(auth)/sign-up',
                    params: { redirect: '/' },
                  })
                }
                style={({ pressed }) => [
                  styles.actionButton,
                  buttonLayoutStyle,
                  {
                    borderColor: colors.border,
                    borderRadius: radii.item,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[buttonLabelStyle(16), { color: colors.text }]}>
                  Create account
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.introImageWrap}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={introImage}
            style={styles.introImage}
          />
        </View>
      </ScrollView>

      {user ? (
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
          <Button icon="logout" label="Sign out" onPress={handleSignOut} variant="surface" />
        </View>
      ) : null}
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
  headerSpacer: {
    flexShrink: 0,
    height: 44,
    width: 44,
  },
  title: {
    flex: 1,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
    minWidth: 0,
  },
  container: {
    flexGrow: 1,
  },
  scroll: {
    flex: 1,
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
  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  avatarText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
  },
  accountEmail: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  editButton: {
    alignItems: 'center',
    borderRadius: 20,
    flexShrink: 0,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  accountActions: {},
  introImageWrap: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 260,
  },
  introImage: {
    height: 240,
    width: 240,
  },
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    borderWidth: 1,
    minHeight: 48,
  },
});
