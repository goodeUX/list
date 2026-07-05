import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/Button';
import JoinInviteLanding from '@/components/JoinInviteLanding';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/contexts/PlanContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLists } from '@/hooks/useLists';
import { shouldShowInviteAppLanding } from '@/lib/inviteLanding';
import { joinList } from '@/lib/joinList';
import { canJoinList } from '@/lib/listLimits';
import {
  clearPendingInviteListId,
  setPendingInviteListId,
} from '@/lib/pendingInvite';

export default function JoinListScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const resolvedListId = typeof listId === 'string' ? listId : undefined;
  const { user, loading: authLoading } = useAuth();
  const { colors, spacing } = useTheme();
  const { plan, planReady, purchasesAvailable } = usePlan();
  const { lists, loading: listsLoading } = useLists();
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [showAppLanding] = useState(() => shouldShowInviteAppLanding());

  useEffect(() => {
    if (!resolvedListId) {
      return;
    }

    void setPendingInviteListId(resolvedListId);
  }, [resolvedListId]);

  useEffect(() => {
    if (authLoading || joining || showAppLanding || blocked) {
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

    // Wait for plan + memberships so the cap check sees real data.
    if (!planReady || listsLoading) {
      return;
    }

    const alreadyMember = lists.some((list) => list.id === resolvedListId);
    if (!alreadyMember && !canJoinList(plan, lists.length)) {
      setBlocked(true);
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
  }, [
    authLoading,
    blocked,
    joining,
    lists,
    listsLoading,
    plan,
    planReady,
    resolvedListId,
    showAppLanding,
    user,
  ]);

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
        {blocked ? (
          <>
            <Text style={[styles.message, { color: colors.text }]}>
              You've reached the Free plan's list limit, so this invite can't be
              accepted yet. Go Premium for unlimited lists, or leave one of your
              current lists first.
            </Text>
            {purchasesAvailable ? (
              <Button
                label="Upgrade to Premium"
                onPress={() =>
                  router.push({
                    pathname: '/(auth)/paywall',
                    params: { redirect: `/join/${resolvedListId}` },
                  })
                }
                variant="primary"
              />
            ) : null}
            <Button
              label="Back to my lists"
              onPress={() => router.replace('/')}
              variant="ghost"
            />
          </>
        ) : error ? (
          <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
        ) : (
          <ActivityIndicator color={colors.accent} size="large" />
        )}
        {!error && !blocked ? (
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
    alignSelf: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    maxWidth: 440,
    width: '100%',
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
