import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { ColorScheme } from '@/lib/theme';

const ICON_SIZE = 20;
const TITLE_GAP = 8;
const TEXT_INDENT = ICON_SIZE + TITLE_GAP;

const BANNER_COLORS = {
  light: {
    accent: '#4A7FBF',
    background: '#E8F0FA',
    border: '#C5D9EF',
  },
  dark: {
    accent: '#7EB3E8',
    background: '#1E2838',
    border: '#2E4058',
  },
} as const satisfies Record<ColorScheme, { accent: string; background: string; border: string }>;

type GuestSignInBannerProps = {
  disabled?: boolean;
  onDismiss?: () => void;
  onSignIn?: () => void;
  signInRedirect?: string;
};

export default function GuestSignInBanner({
  disabled = false,
  onDismiss,
  onSignIn,
  signInRedirect = '/',
}: GuestSignInBannerProps) {
  const { colors, colorScheme, radii, spacing } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const bannerColors = BANNER_COLORS[colorScheme];

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  const handleSignIn = useCallback(() => {
    if (onSignIn) {
      onSignIn();
      return;
    }

    router.push({
      pathname: '/(auth)/sign-in',
      params: { redirect: signInRedirect },
    });
  }, [onSignIn, signInRedirect]);

  if (authLoading || user || dismissed) {
    return null;
  }

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: bannerColors.background,
          borderColor: bannerColors.border,
          borderRadius: radii.item,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MaterialIcons color={bannerColors.accent} name="info-outline" size={ICON_SIZE} />
          <Text style={[styles.title, { color: colors.text }]}>You aren&apos;t signed in.</Text>
        </View>
        <Pressable
          accessibilityLabel="Dismiss sign-in reminder"
          accessibilityRole="button"
          disabled={disabled}
          hitSlop={8}
          onPress={handleDismiss}
          style={({ pressed }) => [styles.dismiss, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialIcons color={colors.textSecondary} name="close" size={20} />
        </Pressable>
      </View>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        You can still make lists, but signing in is required to share or sync them.
      </Text>
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="link"
          disabled={disabled}
          onPress={handleSignIn}
          style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.link, { color: bannerColors.accent }]}>Sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    gap: 8,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  titleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: TITLE_GAP,
    minWidth: 0,
  },
  title: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
  },
  dismiss: {
    alignItems: 'center',
    flexShrink: 0,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  body: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    paddingLeft: TEXT_INDENT,
  },
  footer: {
    alignItems: 'flex-end',
  },
  linkButton: {
    alignSelf: 'flex-end',
  },
  link: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
});
