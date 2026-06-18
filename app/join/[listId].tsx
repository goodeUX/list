import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import JoinInviteLanding from '@/components/JoinInviteLanding';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { shouldShowInviteAppLanding } from '@/lib/inviteLanding';
import { joinList } from '@/lib/joinList';
import {
  clearPendingInviteListId,
  setPendingInviteListId,
} from '@/lib/pendingInvite';

export default function JoinListScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const resolvedListId = typeof listId === 'string' ? listId : undefined;
  const { user, loading: authLoading } = useAuth();
  const { colors, spacing } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [showAppLanding] = useState(() => shouldShowInviteAppLanding());

  useEffect(() => {
    if (!resolvedListId) {
      return;
    }

    void setPendingInviteListId(resolvedListId);
  }, [resolvedListId]);

  useEffect(() => {
    if (authLoading || joining || showAppLanding) {
      return;
    }

    if (!resolvedListId) {
      setError('Invalid invite link.');
      return;
    }

    if (!user) {
      router.replace({
        pathname: '/(auth)/sign-in',
        params: { redirect: `/join/${resolvedListId}` },
      });
      return;
    }

    setJoining(true);
    setError(null);

    joinList(resolvedListId, user.uid)
      .then(async () => {
        await clearPendingInviteListId();
        router.replace({
          pathname: '/list/[id]',
          params: { id: resolvedListId },
        });
      })
      .catch(() => {
        setError('Could not join this list. It may not exist or you may not have access.');
        setJoining(false);
      });
  }, [authLoading, joining, resolvedListId, showAppLanding, user]);

  if (showAppLanding && resolvedListId) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <JoinInviteLanding listId={resolvedListId} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={[styles.container, { padding: spacing.lg }]}>
        {error ? (
          <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
        ) : (
          <ActivityIndicator color={colors.accent} size="large" />
        )}
        {!error ? (
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Joining list...
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
  },
  message: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  error: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
