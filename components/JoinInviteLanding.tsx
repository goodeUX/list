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
  const { colors, space, typography } = useTheme();
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
    <View style={[styles.container, { gap: space[6], padding: space[6] }]}>
      <View style={{ gap: space[2] }}>
        <Text style={[typography.h1, styles.centered, { color: colors.text }]}>
          Join a shared list
        </Text>
        <Text style={[typography.body, styles.centered, { color: colors.textSecondary }]}>
          Opening {APP_NAME} if it is installed. Otherwise, we will take you to
          the app store.
        </Text>
      </View>

      <ActivityIndicator color={colors.primary} size="large" />

      <Text style={[typography.bodyS, styles.centered, { color: colors.textSecondary }]}>
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
  centered: {
    textAlign: 'center',
  },
});
