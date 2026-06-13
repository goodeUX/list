import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { ThemePreference } from '@/lib/theme';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const { colors, radii, spacing, preference, setPreference } = useTheme();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.container, { padding: spacing.lg, gap: spacing.lg }]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
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
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  themeOptionText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    textAlign: 'center',
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
