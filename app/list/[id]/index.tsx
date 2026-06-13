import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, getDocFromCache, onSnapshot } from 'firebase/firestore';

import ListOptionsSheet from '@/components/ListOptionsSheet';
import ShareSheet from '@/components/ShareSheet';
import SwipeableListItemRow from '@/components/SwipeableListItemRow';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useItemHistory } from '@/hooks/useItemHistory';
import { useListItems } from '@/hooks/useListItems';
import { usePresence } from '@/hooks/usePresence';
import { useChildSlideTransition } from '@/hooks/useSlideTransition';
import { db } from '@/lib/firebase';
import { handleFirestoreListenerError } from '@/lib/firestoreListenerErrors';
import { getLocalList, getCachedLocalList, subscribeLocalData } from '@/lib/localStore';
import { playAddItemHaptic } from '@/lib/haptics';
import { deleteListById } from '@/lib/listMutations';
import type { ListItem } from '@/lib/types';

const LIST_ITEMS_FADE_DELAY_MS = 100;
const LIST_ITEMS_FADE_MS = 500;
const LIST_ITEMS_FADE_EASING = Easing.bezier(0, 0, 0.58, 1);
const ADD_SUBMIT_BUTTON_SIZE = 40;
const ADD_INPUT_ROW_NATIVE_ID = 'list-add-input-row';

export default function ListDetailScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string; emoji?: string }>();
  const listId = typeof params.id === 'string' ? params.id : undefined;
  const paramName = typeof params.name === 'string' ? params.name : '';
  const paramEmoji = typeof params.emoji === 'string' ? params.emoji : '📋';
  const cachedList = listId ? getCachedLocalList(listId) : null;
  const { user } = useAuth();
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [listName, setListName] = useState(paramName || cachedList?.name || '');
  const [listEmoji, setListEmoji] = useState(paramEmoji || cachedList?.emoji || '📋');
  const [listOwnerId, setListOwnerId] = useState(cachedList?.ownerId ?? '');
  const hasTitle = Boolean(paramName || listName);
  const { animatedStyle, goBack, isEnabled: slideTransitionEnabled } =
    useChildSlideTransition({ ready: hasTitle });
  const { items, loading, addItem, toggleItem, deleteItem, clearAllItems } =
    useListItems(listId);
  const listOpacity = useSharedValue(0);
  const { recordItemUsage } = useItemHistory();
  const { activeUsers } = usePresence(user ? listId : undefined);
  const [newItemName, setNewItemName] = useState('');
  const [adding, setAdding] = useState(false);
  const [isAddInputFocused, setIsAddInputFocused] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [listOptionsVisible, setListOptionsVisible] = useState(false);
  const newItemNameRef = useRef('');
  const submitFromKeyboard = useRef(false);
  const refocusingInput = useRef(false);
  const addItemInputRef = useRef<TextInput>(null);
  const closeOpenSwipeable = useRef<(() => void) | null>(null);

  const handleSwipeOpen = useCallback((close: () => void) => {
    closeOpenSwipeable.current?.();
    closeOpenSwipeable.current = close;
  }, []);

  const placeCaretAtStart = (input: TextInput | null) => {
    if (!input || Platform.OS !== 'web') {
      return;
    }

    const nativeInput =
      (input as TextInput & { _node?: HTMLInputElement })._node ??
      (input as unknown as HTMLInputElement);

    if (nativeInput && typeof nativeInput.setSelectionRange === 'function') {
      nativeInput.setSelectionRange(0, 0);
    }
  };

  const focusInputWithCaret = (input: TextInput | null) => {
    if (!input) {
      return;
    }

    input.focus();
    placeCaretAtStart(input);
  };

  const dismissAddInput = useCallback(() => {
    if (refocusingInput.current || submitFromKeyboard.current) {
      return;
    }

    Keyboard.dismiss();
    setIsAddInputFocused(false);
    newItemNameRef.current = '';
    setNewItemName('');
    addItemInputRef.current?.blur();
  }, []);

  const blurAddInput = dismissAddInput;

  const handleBackgroundPress = useCallback(() => {
    if (!isAddInputFocused) {
      return;
    }

    dismissAddInput();
  }, [dismissAddInput, isAddInputFocused]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isAddInputFocused) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const addInputRow = document.getElementById(ADD_INPUT_ROW_NATIVE_ID);
      if (addInputRow?.contains(event.target as Node)) {
        return;
      }

      dismissAddInput();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [dismissAddInput, isAddInputFocused]);

  const refocusAddInput = () => {
    refocusingInput.current = true;
    setIsAddInputFocused(true);

    const applyFocus = () => {
      focusInputWithCaret(addItemInputRef.current);
      setIsAddInputFocused(true);
      refocusingInput.current = false;
    };

    if (Platform.OS === 'web') {
      requestAnimationFrame(() => {
        requestAnimationFrame(applyFocus);
      });
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(applyFocus);
    });
  };

  useEffect(() => {
    if (!listId) {
      return;
    }

    if (!user) {
      let active = true;

      const refresh = async () => {
        const list = await getLocalList(listId);
        if (!active) {
          return;
        }

        if (list) {
          setListName(list.name);
          setListEmoji(list.emoji);
          setListOwnerId(list.ownerId);
        } else {
          setListName('');
          setListOwnerId('');
        }
      };

      void refresh();
      const unsubscribe = subscribeLocalData(() => {
        void refresh();
      });

      return () => {
        active = false;
        unsubscribe();
      };
    }

    const listRef = doc(db, 'lists', listId);

    void getDocFromCache(listRef)
      .then((snapshot) => {
        if (!snapshot.exists()) {
          return;
        }

        const data = snapshot.data();
        setListName((data.name as string) ?? '');
        setListEmoji((data.emoji as string) ?? '📋');
        setListOwnerId((data.ownerId as string) ?? '');
      })
      .catch(() => {
        // Cache miss — onSnapshot will populate the title.
      });

    const unsubscribe = onSnapshot(
      listRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setListName('');
          setListOwnerId('');
          return;
        }

        const data = snapshot.data();
        setListName((data.name as string) ?? '');
        setListEmoji((data.emoji as string) ?? '📋');
        setListOwnerId((data.ownerId as string) ?? '');
      },
      handleFirestoreListenerError,
    );

    return unsubscribe;
  }, [listId, user]);

  useEffect(() => {
    listOpacity.value = 0;
  }, [listId, listOpacity]);

  useEffect(() => {
    if (loading) {
      return;
    }

    listOpacity.value = withDelay(
      LIST_ITEMS_FADE_DELAY_MS,
      withTiming(1, {
        duration: LIST_ITEMS_FADE_MS,
        easing: LIST_ITEMS_FADE_EASING,
      }),
    );
  }, [listId, listOpacity, loading]);

  const listFadeStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
  }));

  const presenceLabel = useMemo(() => {
    if (activeUsers.length === 0) {
      return null;
    }
    if (activeUsers.length === 1) {
      return `${activeUsers[0].displayName} is editing`;
    }
    return `${activeUsers.length} people editing`;
  }, [activeUsers]);

  const handleShare = () => {
    if (!user) {
      router.push('/(auth)/sign-in');
      return;
    }
    setShareSheetVisible(true);
  };

  const displayListName = listName || paramName || 'List';
  const canDeleteList = !user || listOwnerId === 'local' || user.uid === listOwnerId;

  const confirmDestructiveAction = (
    title: string,
    message: string,
    confirmLabel: string,
    onConfirm: () => void,
  ) => {
    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        onConfirm();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: confirmLabel,
        style: 'destructive',
        onPress: onConfirm,
      },
    ]);
  };

  const handleClearList = () => {
    confirmDestructiveAction(
      'Clear list',
      `Remove all items from “${displayListName}”? This cannot be undone.`,
      'Clear',
      () => {
        void clearAllItems().catch(() => {
          Alert.alert('Could not clear list', 'Please try again.');
        });
      },
    );
  };

  const handleDeleteList = () => {
    if (!listId) {
      return;
    }

    confirmDestructiveAction(
      'Delete list',
      `Delete “${displayListName}” permanently? This cannot be undone.`,
      'Delete',
      () => {
        const idToDelete = listId;
        goBack();
        void deleteListById(idToDelete, user).catch(() => {
          Alert.alert('Could not delete list', 'Please try again.');
        });
      },
    );
  };

  const handleOpenListOptions = () => {
    blurAddInput();
    setListOptionsVisible(true);
  };

  const handleChangeNewItemName = (text: string) => {
    newItemNameRef.current = text;
    setNewItemName(text);
  };

  const handleAddItem = async (refocusAfter = false) => {
    const trimmedName = newItemNameRef.current.trim();
    if (!listId || !trimmedName || adding) {
      return;
    }

    setAdding(true);
    try {
      await addItem(trimmedName);
      await recordItemUsage(trimmedName, null, listId);
      playAddItemHaptic();
      newItemNameRef.current = '';
      setNewItemName('');
    } finally {
      setAdding(false);
      if (refocusAfter) {
        refocusAddInput();
      }
    }
  };

  const handleSubmitEditing = () => {
    submitFromKeyboard.current = true;
    void handleAddItem(true);
  };

  const handleSubmitPress = () => {
    submitFromKeyboard.current = true;
    void handleAddItem(true);
  };

  const handleSubmitMouseDown = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!newItemNameRef.current.trim() || adding) {
      return;
    }

    submitFromKeyboard.current = true;
    void handleAddItem(true);
  };

  const canSubmitNewItem = Boolean(newItemName.trim()) && !adding;
  const showSubmitButton = isAddInputFocused && newItemName.length > 0;

  const handleInputFocus = () => {
    setIsAddInputFocused(true);
    placeCaretAtStart(addItemInputRef.current);
  };

  const handleInputBlur = () => {
    if (refocusingInput.current) {
      return;
    }

    setTimeout(() => {
      if (refocusingInput.current) {
        return;
      }

      if (submitFromKeyboard.current) {
        submitFromKeyboard.current = false;
        return;
      }

      setIsAddInputFocused(false);
      newItemNameRef.current = '';
      setNewItemName('');
    }, 0);
  };

  const renderStaticListItem = useCallback(
    ({ item }: { item: ListItem }) => (
      <SwipeableListItemRow
        item={item}
        onDelete={() => {
          blurAddInput();
          void deleteItem(item.id);
        }}
        onPress={() => {
          blurAddInput();
          if (!listId) {
            return;
          }
          router.push({
            pathname: '/list/[id]/item/[itemId]',
            params: { id: listId, itemId: item.id },
          });
        }}
        onSwipeOpen={(close) => {
          blurAddInput();
          handleSwipeOpen(close);
        }}
        onToggle={() => {
          blurAddInput();
          void toggleItem(item.id);
        }}
      />
    ),
    [deleteItem, handleSwipeOpen, listId, toggleItem],
  );

  const listContentStyle = useMemo(
    () => [
      styles.listContent,
      {
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
      },
    ],
    [spacing.lg, spacing.sm, spacing.xl],
  );

  const itemSeparator = useCallback(
    () => (
      <View
        style={[
          styles.itemSeparator,
          { backgroundColor: colors.border },
        ]}
      />
    ),
    [colors.border],
  );

  const emptyList = (
    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
      No items yet. Add your first one above.
    </Text>
  );

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios' && isAddInputFocused}
        style={styles.flex}
      >
      <Pressable onPress={handleBackgroundPress}>
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
          onPress={() => {
            blurAddInput();
            goBack();
          }}
          style={({ pressed }) => [
            styles.shareButton,
            {
              backgroundColor: colors.surface,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialIcons color={colors.accent} name="chevron-left" size={24} />
        </Pressable>

        <View style={styles.titleBlock}>
          <Text style={styles.emoji}>{listEmoji || paramEmoji}</Text>
          <View style={styles.titleTextBlock}>
            <Text
              numberOfLines={2}
              style={[styles.title, { color: colors.text }]}
            >
              {listName || paramName || 'List'}
            </Text>
            {presenceLabel ? (
              <View style={styles.presenceRow}>
                <View
                  style={[styles.presenceDot, { backgroundColor: colors.success }]}
                />
                <Text style={[styles.presenceText, { color: colors.textSecondary }]}>
                  {presenceLabel}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="List options"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleOpenListOptions}
            style={({ pressed }) => [
              styles.shareButton,
              {
                backgroundColor: colors.surface,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialIcons color={colors.accent} name="more-horiz" size={22} />
          </Pressable>

          <Pressable
            accessibilityLabel="Share list"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              blurAddInput();
              handleShare();
            }}
            style={({ pressed }) => [
              styles.shareButton,
              {
                backgroundColor: colors.surface,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialIcons color={colors.accent} name="ios-share" size={22} />
          </Pressable>
        </View>
      </View>
      </Pressable>

      <View
        style={[
          styles.addSection,
          { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
        ]}
      >
        <View
          nativeID={ADD_INPUT_ROW_NATIVE_ID}
          style={[
            styles.addInputRow,
            {
              backgroundColor: isAddInputFocused ? colors.surfaceMuted : colors.surface,
              borderColor: isAddInputFocused ? colors.accent : colors.border,
              borderRadius: radii.item,
              paddingRight: showSubmitButton ? spacing.xs : 15,
            },
          ]}
        >
          <TextInput
            ref={addItemInputRef}
            cursorColor={colors.accent}
            editable={!adding}
            onBlur={handleInputBlur}
            onChangeText={handleChangeNewItemName}
            onFocus={handleInputFocus}
            onSubmitEditing={handleSubmitEditing}
            placeholder="Add an item..."
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            selectionColor={colors.accentSoft}
            style={[
              styles.addInput,
              {
                color: colors.text,
                ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
              },
            ]}
            value={newItemName}
          />
          <Pressable
            accessibilityLabel="Add item"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmitNewItem }}
            disabled={Platform.OS !== 'web' && !canSubmitNewItem}
            onMouseDown={Platform.OS === 'web' ? handleSubmitMouseDown : undefined}
            onPress={Platform.OS === 'web' ? undefined : handleSubmitPress}
            pointerEvents={showSubmitButton ? 'auto' : 'none'}
            style={({ pressed }) => [
              styles.addSubmitButton,
              {
                backgroundColor: colors.accent,
                borderRadius: radii.checkbox,
                opacity: showSubmitButton ? (pressed && canSubmitNewItem ? 0.85 : 1) : 0,
                width: showSubmitButton ? ADD_SUBMIT_BUTTON_SIZE : 0,
              },
            ]}
          >
            <MaterialIcons color={colors.surface} name="check" size={22} />
          </Pressable>
        </View>
      </View>

      <Animated.View style={[styles.listContainer, listFadeStyle]}>
        <Pressable onPress={handleBackgroundPress} style={styles.flex}>
        <FlatList
          contentContainerStyle={listContentStyle}
          data={items}
          ItemSeparatorComponent={itemSeparator}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="never"
          ListEmptyComponent={emptyList}
          renderItem={renderStaticListItem}
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={false}
          style={styles.flex}
        />
        </Pressable>
      </Animated.View>

      {listId ? (
        <>
          <ShareSheet
            listId={listId}
            listName={listName || 'List'}
            onClose={() => setShareSheetVisible(false)}
            visible={shareSheetVisible}
          />

          <ListOptionsSheet
            onClearList={handleClearList}
            onClose={() => setListOptionsVisible(false)}
            onDeleteList={handleDeleteList}
            showDeleteList={canDeleteList}
            visible={listOptionsVisible}
          />
        </>
      ) : null}
      </KeyboardAvoidingView>
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
  shareButton: {
    alignItems: 'center',
    borderRadius: 22,
    flexShrink: 0,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerActions: {
    flexDirection: 'row',
    flexShrink: 0,
    gap: 4,
  },
  titleBlock: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  titleTextBlock: {
    flex: 1,
    gap: 2,
    minHeight: 30,
  },
  emoji: {
    fontSize: 28,
    lineHeight: 32,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
  },
  presenceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  presenceDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  presenceText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  addSection: {
    gap: 8,
  },
  addInputRow: {
    alignItems: 'center',
    borderWidth: 2,
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 15,
    paddingVertical: 6,
  },
  addInput: {
    flex: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    minHeight: ADD_SUBMIT_BUTTON_SIZE - 4,
    paddingVertical: 7,
  },
  addSubmitButton: {
    alignItems: 'center',
    height: ADD_SUBMIT_BUTTON_SIZE,
    justifyContent: 'center',
    width: ADD_SUBMIT_BUTTON_SIZE,
  },
  listContainer: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    flexGrow: 1,
  },
  itemSeparator: {
    height: StyleSheet.hairlineWidth,
  },
  emptyText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 24,
    textAlign: 'center',
  },
});
