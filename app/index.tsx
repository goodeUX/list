// @refresh reset
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DraggableFlatList, {
  type DragEndParams,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import ChooseEditableListsModal from '@/components/ChooseEditableListsModal';
import EmptyState from '@/components/EmptyState';
import ListCard from '@/components/ListCard';
import ListFormModal from '@/components/ListFormModal';
import ListSortMenu from '@/components/ListSortMenu';
import SignInBenefitsModal from '@/components/SignInBenefitsModal';
import UpgradePromptModal from '@/components/UpgradePromptModal';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/contexts/PlanContext';
import { useTheme } from '@/contexts/ThemeContext';
import { APP_NAME } from '@/lib/appName';
import { buildPlanChooserHref } from '@/lib/authRedirect';
import {
  hasSeenListsIntro,
  markListsIntroSeen,
} from '@/lib/authLocalState';
import {
  canCreateList,
  FREE_LIST_LIMIT,
  isAtFreeListLimit,
  isListEditable,
  needsEditableListPick,
  resolveEditableListIds,
} from '@/lib/listLimits';
import { useLists } from '@/hooks/useLists';
import { useListSortPreference } from '@/hooks/useListSortPreference';
import { DROP_ANIMATION_CONFIG } from '@/lib/dragAnimation';
import { playToggleHaptic } from '@/lib/haptics';
import { customOrderFrom, pruneCustomOrder, sortLists } from '@/lib/listSort';
import {
  acquireKeyboardSession,
  releaseKeyboardProxy,
  renewKeyboardSession,
} from '@/lib/keyboardProxy';
import { markPendingAddInputFocus } from '@/lib/pendingAddInputFocus';
import type { AppList } from '@/lib/types';

const DEFAULT_EMOJI = '📋';
const FAB_SIZE = 72;
// Squircle corner, matching the product's other buttons. borderCurve only
// smooths the corner on iOS; Android draws a plain rounded rect at this radius.
const FAB_BORDER_RADIUS = 24;
const LISTS_FADE_MS = 300;
// Far enough that overscroll bounce alone doesn't flicker the header divider.
const HEADER_DIVIDER_SCROLL_THRESHOLD = 2;
const HEADER_DIVIDER_FADE_MS = 150;

function formatSummary(listCount: number, sharedCount: number): string {
  const listLabel = listCount === 1 ? '1 list' : `${listCount} lists`;
  if (sharedCount === 0) {
    return listLabel;
  }
  const sharedLabel = sharedCount === 1 ? '1 shared' : `${sharedCount} shared`;
  return `${listLabel} · ${sharedLabel}`;
}

export default function ListsHomeScreen() {
  const { colors, spacing } = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const { user } = useAuth();
  const { lists, loading, createList } = useLists();
  const { sortMode, customOrder, setSortMode, applyCustomOrder } =
    useListSortPreference();
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const { plan, purchasesAvailable, planReady, activeListIds, setActiveListIds } =
    usePlan();
  const listsOpacity = useSharedValue(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countsRefreshKey, setCountsRefreshKey] = useState(0);
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);
  const [limitPromptVisible, setLimitPromptVisible] = useState(false);
  const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);

  useEffect(() => {
    let active = true;
    void hasSeenListsIntro().then((seen) => {
      if (active) {
        setIntroSeen(seen);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // The upgrade prompt only makes sense for a signed-in user. If they sign
  // out while it's open (e.g. from Settings pushed above this screen), reset
  // it so it can't overlap the signed-out onboarding/limit modal.
  useEffect(() => {
    if (!user) {
      setUpgradePromptVisible(false);
    }
  }, [user]);

  // First-visit onboarding is derived, not fired imperatively: it shows only
  // while the user is signed out, and vanishes the instant they sign in (e.g.
  // from the opening screen) rather than flashing over a signed-in session.
  const onboardingVisible = introSeen === false && !user && !loading;
  const activePrompt: 'limit' | 'onboarding' | null = limitPromptVisible
    ? 'limit'
    : onboardingVisible
      ? 'onboarding'
      : null;

  useFocusEffect(
    useCallback(() => {
      setCountsRefreshKey((current) => current + 1);

      if (!loading) {
        listsOpacity.value = withTiming(1, {
          duration: LISTS_FADE_MS,
          easing: Easing.out(Easing.cubic),
        });
      }
    }, [listsOpacity, loading]),
  );

  const sharedCount = useMemo(
    () => lists.filter((list) => list.memberIds.length > 1).length,
    [lists],
  );

  const orderedLists = useMemo(
    () => sortLists(lists, sortMode, customOrder),
    [customOrder, lists, sortMode],
  );

  // A drag saves the new arrangement AND switches the mode to custom. The
  // displayed order is derived from lists + prefs, and both prefs are React
  // state first, so this re-derives the dropped order immediately — no
  // separate optimistic copy to keep in sync.
  const handleDragEnd = useCallback(
    ({ data }: DragEndParams<AppList>) => {
      applyCustomOrder(pruneCustomOrder(customOrderFrom(data), data));
    },
    [applyCustomOrder],
  );

  const editableListIds = useMemo(
    () =>
      user && planReady
        ? resolveEditableListIds(plan, lists.map((list) => list.id), activeListIds)
        : ('all' as const),
    [activeListIds, lists, plan, planReady, user],
  );

  const renderListCard = useCallback(
    ({ item, drag, isActive }: RenderItemParams<AppList>) => {
      const startDrag = () => {
        if (Platform.OS !== 'web') {
          playToggleHaptic();
        }
        drag();
      };

      const dragHandle =
        Platform.OS === 'web' ? (
          <Pressable
            accessibilityLabel="Drag to reorder"
            accessibilityRole="button"
            onPressIn={drag}
            style={({ pressed }) => [
              styles.handleButton,
              { opacity: pressed ? 0.6 : 1 },
              Platform.OS === 'web' ? ({ cursor: 'grab' } as object) : null,
            ]}
          >
            <MaterialIcons color={colors.textSecondary} name="drag-indicator" size={20} />
          </Pressable>
        ) : undefined;

      return (
        <View style={[styles.cardCell, isActive ? styles.activeCell : null]}>
          <ListCard
            countsRefreshKey={countsRefreshKey}
            dragHandle={dragHandle}
            isActive={isActive}
            list={item}
            locked={!isListEditable(item.id, editableListIds)}
            onLongPress={Platform.OS !== 'web' ? startDrag : undefined}
          />
        </View>
      );
    },
    [colors.textSecondary, countsRefreshKey, editableListIds],
  );
  const [pickDismissed, setPickDismissed] = useState(false);
  const needsPick =
    Boolean(user) &&
    planReady &&
    !loading &&
    needsEditableListPick(plan, lists.map((list) => list.id), activeListIds);

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
    // Single enforcement point for the free-tier cap. Signed-out users get
    // the sign-in pitch; signed-in free users at the cap get the premium one.
    if (!user && isAtFreeListLimit(lists.length)) {
      setLimitPromptVisible(true);
      return;
    }
    if (user && !canCreateList(plan, lists.length)) {
      setUpgradePromptVisible(true);
      return;
    }

    setError(null);
    setModalVisible(true);
  }, [lists.length, plan, user]);

  const dismissPrompt = useCallback(() => {
    if (limitPromptVisible) {
      setLimitPromptVisible(false);
      return;
    }

    setIntroSeen(true);
    void markListsIntroSeen();
  }, [limitPromptVisible]);

  const handlePromptSignIn = useCallback(() => {
    dismissPrompt();
    router.push(buildPlanChooserHref());
  }, [dismissPrompt]);

  const handleUpgrade = useCallback(() => {
    setUpgradePromptVisible(false);
    router.push({ pathname: '/(auth)/paywall', params: { from: 'settings' } });
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

  // The header divider only appears once content has moved underneath it.
  const [listScrolled, setListScrolled] = useState(false);
  const headerDividerOpacity = useSharedValue(0);

  const handleListScroll = useCallback((offsetY: number) => {
    const next = offsetY > HEADER_DIVIDER_SCROLL_THRESHOLD;
    setListScrolled((current) => (current === next ? current : next));
  }, []);

  useEffect(() => {
    headerDividerOpacity.value = withTiming(listScrolled ? 1 : 0, {
      duration: HEADER_DIVIDER_FADE_MS,
    });
  }, [headerDividerOpacity, listScrolled]);

  const headerDividerStyle = useAnimatedStyle(() => ({
    opacity: headerDividerOpacity.value,
  }));
  const showCreateBar = !loading && lists.length > 0;
  // Cards scroll under the system bar, so every bottom offset clears it by a
  // real gap rather than stopping level with it. Falls back to spacing.md on
  // devices that report no inset.
  const bottomBarInset = safeAreaInsets.bottom + spacing.md;
  const listBottomPadding =
    FAB_SIZE + spacing.md + bottomBarInset + spacing.lg;
  const emptyListBottomPadding = spacing.xl + safeAreaInsets.bottom;

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      {/* No bottom edge: the list is meant to scroll under the system bar, and
          each bottom offset below reserves the inset itself. */}
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.safeArea, { backgroundColor: colors.bg }]}
      >
        <View
          style={[
            styles.headerTop,
            { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            My Lists
          </Text>
          {!loading && lists.length > 0 ? (
            <ListSortMenu
              onSortModeChange={setSortMode}
              onVisibleChange={setSortMenuVisible}
              sortMode={sortMode}
              visible={sortMenuVisible}
            />
          ) : null}

          {/* Swallows every spare pixel, so the title and the buttons never
              compete for width and the title is measured against the whole
              header rather than what a sibling block left over. */}
          <View style={styles.headerSpacer} />

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
            <MaterialIcons color={colors.accent} name="more-horiz" size={24} />
          </Pressable>
        </View>

        {!loading ? (
          <Text
            style={[
              styles.summary,
              { color: colors.textSecondary, paddingHorizontal: spacing.lg },
            ]}
          >
            {summary}
          </Text>
        ) : null}

        {/* Sibling of the header so it spans full width, not inset by its padding. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.headerDivider,
            headerDividerStyle,
            { backgroundColor: colors.border },
          ]}
        />

        {/* Tapping anywhere off the menu closes it. Sits under the header's
            zIndex so the menu itself stays tappable. */}
        {sortMenuVisible ? (
          <Pressable
            accessibilityLabel="Close sort menu"
            onPress={() => setSortMenuVisible(false)}
            style={styles.menuBackdrop}
          />
        ) : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
          <Animated.View
            style={[styles.content, listsFadeStyle, { pointerEvents: 'box-none' }]}
          >
            {lists.length === 0 ? (
              <EmptyState onCreateList={openCreateModal} />
            ) : (
              <DraggableFlatList
                animationConfig={DROP_ANIMATION_CONFIG}
                containerStyle={styles.flex}
                contentContainerStyle={[
                  styles.listContent,
                  {
                    padding: spacing.lg,
                    paddingBottom: showCreateBar
                      ? listBottomPadding
                      : emptyListBottomPadding,
                    // 8 less than the surrounding inset, to sit closer to the header.
                    paddingTop: spacing.md,
                  },
                ]}
                data={orderedLists}
                dragItemOverflow
                extraData={countsRefreshKey}
                keyExtractor={(item) => item.id}
                onDragEnd={handleDragEnd}
                // NOT onScroll: DraggableFlatList installs its own scroll
                // handler on the inner list, so an onScroll prop is discarded.
                onScrollOffsetChange={handleListScroll}
                removeClippedSubviews={false}
                renderItem={renderListCard}
                showsVerticalScrollIndicator={false}
                style={styles.flex}
              />
            )}
          </Animated.View>
        )}

        {showCreateBar ? (
          <View
            style={[
              styles.fabLayer,
              {
                paddingBottom: bottomBarInset,
                paddingRight: spacing.lg,
                pointerEvents: 'box-none',
              },
            ]}
          >
            <Pressable
              accessibilityLabel="Create a new list"
              accessibilityRole="button"
              onPress={openCreateModal}
              style={({ pressed }) => [
                styles.fab,
                styles.fabShadow,
                { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.fabIcon, { color: colors.surface }]}>+</Text>
            </Pressable>
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

      <SignInBenefitsModal
        onDismiss={dismissPrompt}
        onSignIn={handlePromptSignIn}
        subtitle={
          activePrompt === 'limit'
            ? `You've reached the ${FREE_LIST_LIMIT}-list limit for local use. Log in or sign up to unlock:`
            : 'Log in or sign up to unlock more:'
        }
        title={
          activePrompt === 'limit' ? 'Create more lists' : `Get more from ${APP_NAME}`
        }
        visible={activePrompt !== null}
      />

      <UpgradePromptModal
        onDismiss={() => setUpgradePromptVisible(false)}
        onUpgrade={handleUpgrade}
        purchasesAvailable={purchasesAvailable}
        visible={upgradePromptVisible}
      />

      {/* The upgrade prompt is a direct response to a tap, so it wins over
          the ambient chooser; the chooser re-appears once it's dismissed. */}
      <ChooseEditableListsModal
        initialSelection={activeListIds}
        lists={lists}
        onConfirm={async (ids) => {
          await setActiveListIds(ids);
          setPickDismissed(false);
        }}
        onDismiss={() => setPickDismissed(true)}
        visible={needsPick && !pickDismissed && !upgradePromptVisible}
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
  // One flat row: title, sort button, spacer, settings. Nothing nested, so
  // the title is measured against the full header width and cannot be handed
  // a narrower box by a sibling block. gap gives the title its 8px to the
  // sort button; the spacer supplies the rest of the separation.
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    // The sort menu drops out of this row; without this it would be clipped.
    overflow: 'visible',
    paddingBottom: 4,
    position: 'relative',
    zIndex: 2,
  },
  headerSpacer: {
    flex: 1,
  },
  // Matches the list page header's borderBottomWidth: 1 rather than a
  // hairline, which was too thin to read on a high-density screen.
  headerDivider: {
    height: 1,
    width: '100%',
  },
  menuBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
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
    // Exactly the width of its own text: it never grows or shrinks for the
    // sort button beside it, and carries no numberOfLines, so no character
    // can be ellipsized away at any font scale.
    flexGrow: 0,
    flexShrink: 0,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
  },
  summary: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    paddingBottom: 8,
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
  // The gap between cards lives here rather than as a contentContainer `gap`:
  // DraggableFlatList measures cell heights to place a drop, and container gap
  // isn't part of that measurement.
  cardCell: {
    marginBottom: 12,
  },
  activeCell: Platform.select({
    web: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.18)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
  }),
  handleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 32,
  },
  fabLayer: {
    alignItems: 'flex-end',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  fab: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: FAB_BORDER_RADIUS,
    height: FAB_SIZE,
    justifyContent: 'center',
    width: FAB_SIZE,
  },
  fabShadow: Platform.select({
    web: { boxShadow: '0px 6px 16px rgba(44, 36, 23, 0.28)' },
    default: {
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.24,
      shadowRadius: 12,
    },
  }),
  fabIcon: {
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 40,
    lineHeight: 48,
    textAlign: 'center',
  },
});
