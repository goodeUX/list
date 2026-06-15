// @refresh reset
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import EmptyState from '@/components/EmptyState';
import ListCard from '@/components/ListCard';
import ListFormModal from '@/components/ListFormModal';
import { useTheme } from '@/contexts/ThemeContext';
import { buttonLabelStyle, buttonLayoutStyle } from '@/lib/buttonStyles';
import { useLists } from '@/hooks/useLists';
import {
  acquireKeyboardSession,
  releaseKeyboardProxy,
  renewKeyboardSession,
} from '@/lib/keyboardProxy';
import { markPendingAddInputFocus } from '@/lib/pendingAddInputFocus';

const DEFAULT_EMOJI = '📋';
const CREATE_BUTTON_HEIGHT = 48;
const LISTS_FADE_MS = 300;

const frostedBackgrounds = {
  light: 'rgba(250, 247, 242, 0.82)',
  dark: 'rgba(26, 22, 18, 0.82)',
} as const;

function formatSummary(listCount: number, sharedCount: number): string {
  const listLabel = listCount === 1 ? '1 list' : `${listCount} lists`;
  if (sharedCount === 0) {
    return listLabel;
  }
  const sharedLabel = sharedCount === 1 ? '1 shared' : `${sharedCount} shared`;
  return `${listLabel} · ${sharedLabel}`;
}

export default function ListsHomeScreen() {
  const { colors, colorScheme, radii, spacing } = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const { lists, loading, createList } = useLists();
  const listsOpacity = useSharedValue(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countsRefreshKey, setCountsRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setCountsRefreshKey((current) => current + 1);
    }, []),
  );

  const sharedCount = useMemo(
    () => lists.filter((list) => list.memberIds.length > 1).length,
    [lists],
  );

  useEffect(() => {
    if (loading) {
      listsOpacity.value = 0;
      return;
    }

    listsOpacity.value = withTiming(1, {
      duration: LISTS_FADE_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [listsOpacity, loading]);

  const listsFadeStyle = useAnimatedStyle(() => ({
    opacity: listsOpacity.value,
  }));

  const openCreateModal = useCallback(() => {
    setError(null);
    setModalVisible(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setModalVisible(false);
    setError(null);
  }, []);

  const prepareCreateListKeyboard = useCallback(() => {
    markPendingAddInputFocus();

    if (Platform.OS === 'web') {
      acquireKeyboardSession();
    }
  }, []);

  const handleCreateList = useCallback(
    async (name: string, emoji: string) => {
      markPendingAddInputFocus();

      if (Platform.OS === 'web') {
        acquireKeyboardSession();
      }

      setCreating(true);
      setError(null);
      try {
        const listId = await createList(name, emoji);
        setModalVisible(false);

        if (Platform.OS === 'web') {
          renewKeyboardSession();
        }

        router.push({
          pathname: '/list/[id]',
          params: {
            id: listId,
            name,
            emoji,
            focusAdd: '1',
          },
        });
      } catch {
        releaseKeyboardProxy();
        setError('Could not create list. Please try again.');
      } finally {
        setCreating(false);
      }
    },
    [createList],
  );

  const summary = formatSummary(lists.length, sharedCount);
  const showCreateBar = !loading && lists.length > 0;
  const bottomBarInset = Math.max(safeAreaInsets.bottom, spacing.md);
  const listBottomPadding =
    CREATE_BUTTON_HEIGHT + spacing.md * 2 + bottomBarInset + spacing.lg;

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
          <View style={styles.headerTop}>
            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: colors.text }]}>My Lists</Text>
              {!loading ? (
                <Text style={[styles.summary, { color: colors.textSecondary }]}>
                  {summary}
                </Text>
              ) : null}
            </View>

            <Pressable
              accessibilityLabel="Settings"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [
                styles.settingsButton,
                {
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <MaterialIcons color={colors.accent} name="tune" size={24} />
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
          <Animated.View style={[styles.content, listsFadeStyle]}>
            {lists.length === 0 ? (
              <EmptyState onCreateList={openCreateModal} />
            ) : (
              <FlatList
                contentContainerStyle={[
                  styles.listContent,
                  {
                    gap: spacing.md,
                    padding: spacing.lg,
                    paddingBottom: showCreateBar ? listBottomPadding : spacing.xl,
                  },
                ]}
                data={lists}
                extraData={countsRefreshKey}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <ListCard countsRefreshKey={countsRefreshKey} list={item} />
                )}
                showsVerticalScrollIndicator={false}
              />
            )}
          </Animated.View>
        )}

        {showCreateBar ? (
          <View
            pointerEvents="box-none"
            style={[styles.bottomBar, { paddingBottom: bottomBarInset }]}
          >
            <View
              style={[
                styles.bottomBarSurface,
                {
                  backgroundColor: frostedBackgrounds[colorScheme],
                  borderTopColor: colors.border,
                  paddingHorizontal: spacing.lg,
                  paddingTop: spacing.lg,
                  paddingBottom: spacing.md,
                },
                Platform.OS === 'web'
                  ? ({
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                    } as object)
                  : null,
              ]}
            >
              <Pressable
                accessibilityLabel="Create a new list"
                accessibilityRole="button"
                onPress={openCreateModal}
                onPressIn={openCreateModal}
                style={({ pressed }) => [
                  styles.createListButton,
                  buttonLayoutStyle,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: radii.item,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View style={styles.createListButtonContent}>
                  <MaterialIcons color={colors.accent} name="add" size={24} />
                  <Text style={[buttonLabelStyle(16), { color: colors.text }]}>
                    Create a new list
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        ) : null}
      </SafeAreaView>

      <ListFormModal
        error={error}
        initialEmoji={DEFAULT_EMOJI}
        onClose={closeCreateModal}
        onSubmit={handleCreateList}
        onSubmitPressIn={prepareCreateListKeyboard}
        submitLabel="Create list"
        submitting={creating}
        title="New list"
        visible={modalVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    gap: 4,
  },
  headerTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  settingsButton: {
    alignItems: 'center',
    borderRadius: 22,
    flexShrink: 0,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
  },
  summary: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  bottomBar: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  bottomBarSurface: {
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
  },
  createListButton: {
    minHeight: 54,
    width: '100%',
  },
  createListButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
