import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { joinList } from '@/lib/joinList';

export default function JoinListScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const resolvedListId = typeof listId === 'string' ? listId : undefined;
  const { user, loading: authLoading } = useAuth();
  const { colors, spacing } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (authLoading || joining) {
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
      .then(() => {
        router.replace({
          pathname: '/list/[id]',
          params: { id: resolvedListId },
        });
      })
      .catch(() => {
        setError('Could not join this list. It may not exist or you may not have access.');
        setJoining(false);
      });
  }, [authLoading, joining, resolvedListId, user]);

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
