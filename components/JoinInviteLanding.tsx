import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { APP_NAME } from '@/lib/appName';
import {
  getAndroidInviteIntentUrl,
  getAppStoreUrlForPlatform,
} from '@/lib/appStoreUrls';
import { getInviteUrl } from '@/lib/inviteUrl';
import { setPendingInviteListId } from '@/lib/pendingInvite';

type JoinInviteLandingProps = {
  listId: string;
};

function getMobileUserAgentPlatform(): 'android' | 'ios' | 'other' {
  if (typeof navigator === 'undefined') {
    return 'other';
  }

  if (/Android/i.test(navigator.userAgent)) {
    return 'android';
  }

  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return 'ios';
  }

  return 'other';
}

export default function JoinInviteLanding({ listId }: JoinInviteLandingProps) {
  const { colors, spacing } = useTheme();
  const storeUrl = getAppStoreUrlForPlatform(listId);
  const inviteUrl = getInviteUrl(listId);
  const platform = getMobileUserAgentPlatform();

  useEffect(() => {
    void setPendingInviteListId(listId).then(() => {
      if (typeof window === 'undefined') {
        return;
      }

      if (platform === 'android') {
        window.location.replace(getAndroidInviteIntentUrl(listId));
        return;
      }

      if (platform === 'ios') {
        window.location.href = `list://join/${encodeURIComponent(listId)}`;

        if (storeUrl) {
          window.setTimeout(() => {
            window.location.replace(storeUrl);
          }, 1200);
        }
        return;
      }

      if (storeUrl) {
        window.location.replace(storeUrl);
        return;
      }

      void Linking.openURL(inviteUrl);
    });
  }, [inviteUrl, listId, platform, storeUrl]);

  return (
    <View style={[styles.container, { gap: spacing.lg, padding: spacing.lg }]}>
      <View style={{ gap: spacing.sm }}>
        <Text style={[styles.title, { color: colors.text }]}>
          Join a shared list
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Opening {APP_NAME} if it is installed. Otherwise, we will take you to
          the app store.
        </Text>
      </View>

      <ActivityIndicator color={colors.accent} size="large" />

      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        If nothing happens, open the same invite link again after installing.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  hint: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
