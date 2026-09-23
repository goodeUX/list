import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState, type ElementRef } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
  type ImageSourcePropType,
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

import AddItemSuggestions from '@/components/AddItemSuggestions';
import ListOptionsMenu from '@/components/ListOptionsMenu';
import EmojiPickerButton from '@/components/EmojiPickerButton';
import EmojiPickerSheet, { useEmojiSheetDismissal } from '@/components/EmojiPickerSheet';
import { LIST_NAME_MAX_LENGTH, normalizeListName } from '@/lib/listName';
import { useLastKeyboardHeight } from '@/lib/useLastKeyboardHeight';
import ReorderableItemList from '@/components/ReorderableItemList';
import AddInputRow from '@/components/AddInputRow';
import ThemedTextInput from '@/components/ThemedTextInput';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useListAccess } from '@/hooks/useListAccess';
import { useListItemHistory } from '@/hooks/useListItemHistory';
import { isOptimisticListItem, useListItems } from '@/hooks/useListItems';
import { useChildSlideTransition } from '@/hooks/useSlideTransition';
import { showAppAlert } from '@/lib/appAlert';
import { getItemSuggestions, type ItemSuggestion } from '@/lib/itemSuggestions';
import { db } from '@/lib/firebase';
import { handleFirestoreListenerError } from '@/lib/firestoreListenerErrors';
import { getLocalList, getCachedLocalList, subscribeLocalData } from '@/lib/localStore';
import { playAddItemHaptic, playToggleHaptic } from '@/lib/haptics';
import { scheduleAddItemInputFocus } from '@/lib/focusAddItemInput';
import { dismissKeyboard } from '@/lib/dismissKeyboard';
import { focusTextInputNow } from '@/lib/focusTextInput';
import { isLocalListId, usesCloudListData } from '@/lib/listIds';
import { FREE_LIST_LIMIT } from '@/lib/listLimits';
import { deleteListById, leaveListById, setListMoveDoneToBottom, updateListDetails } from '@/lib/listMutations';
import { consumePendingAddInputFocus } from '@/lib/pendingAddInputFocus';
import { isPurchasesAvailable } from '@/lib/purchases';
import { SLIDE_IN_MS } from '@/lib/slideTransition';
import { listDetailStyles as styles } from '@/lib/listDetailScreenStyles';
import type { ListItem } from '@/lib/types';

const LIST_ITEMS_FADE_MS = 500;
const LIST_ITEMS_FADE_EASING = Easing.bezier(0, 0, 0.58, 1);

const lightListEmptyStateImage =
  require('../../../assets/images/bowl-red.webp') as ImageSourcePropType;
const darkListEmptyStateImage =
  require('../../../assets/images/bowl-blue.webp') as ImageSourcePropType;
const ADD_INPUT_ROW_NATIVE_ID = 'list-add-input-row';

export default function ListDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    emoji?: string;
    focusAdd?: string;
  }>();
  const listId = typeof params.id === 'string' ? params.id : undefined;
  const paramName = typeof params.name === 'string' ? params.name : '';
  const paramEmoji = typeof params.emoji === 'string' ? params.emoji : '📋';
  const shouldFocusAddInput = params.focusAdd === '1';
  const cachedList = listId ? getCachedLocalList(listId) : null;
  const { user } = useAuth();
  const { colors, colorScheme, radii, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [listName, setListName] = useState(paramName || cachedList?.name || '');
  const [listEmoji, setListEmoji] = useState(paramEmoji || cachedList?.emoji || '📋');
  const [listOwnerId, setListOwnerId] = useState(cachedList?.ownerId ?? '');
  const [moveDoneToBottom, setMoveDoneToBottom] = useState(
    cachedList?.moveDoneToBottom ?? false,
  );
  const {
    items,
    loading,
    addItem,
    addOrMergeItems,
    toggleItem,
    restoreItem,
    clearAllItems,
    reorderItems,
    applyItemLayout,
    groupDoneItemsAtBottom,
    toggleSubItem,
  } = useListItems(listId, { moveDoneToBottom });
  const { readOnly } = useListAccess(listId);
  const hasTitle = Boolean(paramName || listName);
  const isSlideReady = hasTitle && !loading;
  const { animatedStyle, goBack, isEnabled: slideTransitionEnabled } =
    useChildSlideTransition({ ready: isSlideReady });
  const listOpacity = useSharedValue(0);
  const { entries: nameHistory, recordName } = useListItemHistory(listId, {
    items,
    itemsLoading: loading,
  });
  const [newItemName, setNewItemName] = useState('');
  const [isAddInputFocused, setIsAddInputFocused] = useState(false);
  const [listOptionsVisible, setListOptionsVisible] = useState(false);
  // The header title is edited in place, and its emoji picked from the sheet.
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const keyboardHeight = useLastKeyboardHeight();
  const newItemNameRef = useRef('');
  const submitFromKeyboard = useRef(false);
  const refocusingInput = useRef(false);
  const lastAddSubmitRef = useRef<{ name: string; at: number } | null>(null);
  const addItemInputRef = useRef<ElementRef<typeof ThemedTextInput>>(null);
  const consumedFocusAddRef = useRef(false);

  useEffect(() => {
    consumedFocusAddRef.current = false;
  }, [listId]);

  const placeCaretAtStart = (input: ElementRef<typeof ThemedTextInput> | null) => {
    if (!input || Platform.OS !== 'web') {
      return;
    }

    const nativeInput =
      (input as ElementRef<typeof ThemedTextInput> & { _node?: HTMLInputElement })._node ??
      (input as unknown as HTMLInputElement);

    if (nativeInput && typeof nativeInput.setSelectionRange === 'function') {
      nativeInput.setSelectionRange(0, 0);
    }
  };

  const focusInputWithCaret = (input: ElementRef<typeof ThemedTextInput> | null) => {
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

    dismissKeyboard(addItemInputRef.current);
    setIsAddInputFocused(false);
    newItemNameRef.current = '';
    setNewItemName('');
  }, []);

  const focusAddInput = useCallback(() => {
    focusTextInputNow(addItemInputRef.current);
    setIsAddInputFocused(true);
    placeCaretAtStart(addItemInputRef.current);
  }, []);

  const blurAddInput = dismissAddInput;

  const handleBackgroundPress = useCallback(() => {
    if (listOptionsVisible) {
      setListOptionsVisible(false);
      return;
    }

    if (editingTitle) {
      // Blurring the title saves it.
      Keyboard.dismiss();
      return;
    }

    if (!isAddInputFocused) {
      return;
    }

    dismissAddInput();
  }, [dismissAddInput, editingTitle, isAddInputFocused, listOptionsVisible]);

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

  useEffect(() => {
    listOpacity.value = 0;
  }, [listId, listOpacity]);

  useEffect(() => {
    if (!isSlideReady) {
      return;
    }

    const slideInDelayMs = slideTransitionEnabled ? SLIDE_IN_MS : 0;

    listOpacity.value = withDelay(
      slideInDelayMs,
      withTiming(1, {
        duration: LIST_ITEMS_FADE_MS,
        easing: LIST_ITEMS_FADE_EASING,
      }),
    );
  }, [isSlideReady, listId, listOpacity, slideTransitionEnabled]);

  const listFadeStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
  }));

  const refocusAddInput = useCallback(() => {
    submitFromKeyboard.current = true;
    refocusingInput.current = true;
    setIsAddInputFocused(true);

    const clearRefocusFlags = () => {
      setTimeout(() => {
        refocusingInput.current = false;
        submitFromKeyboard.current = false;
      }, 200);
    };

    if (Platform.OS === 'web') {
      focusTextInputNow(addItemInputRef.current);
      setIsAddInputFocused(true);
      clearRefocusFlags();
      return;
    }

    scheduleAddItemInputFocus(
      () => addItemInputRef.current,
      () => {
        setIsAddInputFocused(true);
        clearRefocusFlags();
      },
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      const shouldFocus =
        shouldFocusAddInput || consumePendingAddInputFocus();

      if (!shouldFocus || !listId || consumedFocusAddRef.current) {
        return;
      }

      consumedFocusAddRef.current = true;
      refocusingInput.current = true;
      setIsAddInputFocused(true);

      scheduleAddItemInputFocus(
        () => addItemInputRef.current,
        () => {
          setIsAddInputFocused(true);
          placeCaretAtStart(addItemInputRef.current);
          refocusingInput.current = false;
        },
      );

      if (shouldFocusAddInput) {
        router.setParams({ focusAdd: '' });
      }
    }, [listId, shouldFocusAddInput]),
  );

  useEffect(() => {
    if (user && isLocalListId(listId)) {
      router.replace('/');
    }
  }, [listId, user]);

  useEffect(() => {
    if (!listId) {
      return;
    }

    if (!usesCloudListData(user, listId)) {
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
          setMoveDoneToBottom(list.moveDoneToBottom);
        } else {
          setListName('');
          setListOwnerId('');
          setMoveDoneToBottom(false);
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
        setMoveDoneToBottom((data.moveDoneToBottom as boolean) ?? false);
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
          setMoveDoneToBottom(false);
          return;
        }

        const data = snapshot.data();
        setListName((data.name as string) ?? '');
        setListEmoji((data.emoji as string) ?? '📋');
        setListOwnerId((data.ownerId as string) ?? '');
        setMoveDoneToBottom((data.moveDoneToBottom as boolean) ?? false);
      },
      handleFirestoreListenerError,
    );

    return unsubscribe;
  }, [listId, user]);

  const displayListName = listName || paramName || 'List';

  const handleShare = () => {
    if (readOnly) {
      showReadOnlyNotice();
      return;
    }
    if (!user) {
      router.push({
        pathname: '/(auth)/sign-in',
        params: listId ? { redirect: `/list/${listId}/share` } : {},
      });
      return;
    }
    if (!listId) {
      return;
    }

    router.push({
      pathname: '/list/[id]/share',
      params: {
        id: listId,
        name: displayListName,
      },
    });
  };

  const canDeleteList = !user || listOwnerId === 'local' || user.uid === listOwnerId;
  const canLeaveList =
    Boolean(user) &&
    Boolean(listId) &&
    usesCloudListData(user, listId) &&
    listOwnerId !== 'local' &&
    user.uid !== listOwnerId;

  const confirmDestructiveAction = (
    title: string,
    message: string,
    confirmLabel: string,
    onConfirm: () => void,
  ) => {
    showAppAlert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: confirmLabel,
        style: 'destructive',
        onPress: onConfirm,
      },
    ]);
  };

  const showReadOnlyNotice = () => {
    showAppAlert(
      'This list is read-only',
      `The Free plan includes ${FREE_LIST_LIMIT} editable lists. Upgrade to Premium, or delete/leave a list to free a slot.`,
    );
  };

  const currentListName = listName || paramName;
  const currentListEmoji = listEmoji || paramEmoji;

  /** Saves the list's name and emoji, showing the change straight away. */
  const saveListDetails = useCallback(
    async (name: string, emoji: string) => {
      if (!listId) {
        return;
      }
      const previousName = currentListName;
      const previousEmoji = currentListEmoji;
      setListName(name);
      setListEmoji(emoji);
      try {
        await updateListDetails(listId, user, { name, emoji });
      } catch {
        setListName(previousName);
        setListEmoji(previousEmoji);
        showAppAlert('Could not update list', 'Please try again.');
      }
    },
    [currentListEmoji, currentListName, listId, user],
  );

  /** Whether a tap on the title may edit it; handles the menu and read-only lists. */
  const canEditTitle = () => {
    if (listOptionsVisible) {
      setListOptionsVisible(false);
      return false;
    }
    if (readOnly) {
      showReadOnlyNotice();
      return false;
    }
    return true;
  };

  const handleStartEditingTitle = () => {
    if (!canEditTitle()) {
      return;
    }
    blurAddInput();
    setEmojiPickerOpen(false);
    setTitleDraft(currentListName);
    setEditingTitle(true);
  };

  const handleFinishEditingTitle = () => {
    setEditingTitle(false);
    const name = normalizeListName(titleDraft);
    // A list must keep a name; an emptied title just reverts.
    if (name && name !== currentListName) {
      void saveListDetails(name, currentListEmoji);
    }
  };

  const handleToggleEmojiPicker = () => {
    if (emojiPickerOpen) {
      setEmojiPickerOpen(false);
      return;
    }
    if (!canEditTitle()) {
      return;
    }
    blurAddInput();
    Keyboard.dismiss();
    setEmojiPickerOpen(true);
  };

  const closeEmojiPicker = useCallback(() => setEmojiPickerOpen(false), []);
  const { onContentTouchStart, onToggleTouchStart } = useEmojiSheetDismissal(
    emojiPickerOpen,
    closeEmojiPicker,
  );

  const handleSelectEmoji = (emoji: string) => {
    setEmojiPickerOpen(false);
    if (emoji !== currentListEmoji) {
      void saveListDetails(currentListName, emoji);
    }
  };

  const handleClearList = () => {
    if (readOnly) {
      showReadOnlyNotice();
      return;
    }
    confirmDestructiveAction(
      'Clear list',
      `Remove all items from “${displayListName}”? This cannot be undone.`,
      'Clear',
      () => {
        void clearAllItems().catch(() => {
          showAppAlert('Could not clear list', 'Please try again.');
        });
      },
    );
  };

  const handleLeaveList = () => {
    if (!listId || !user) {
      return;
    }

    confirmDestructiveAction(
      'Leave list',
      `Remove “${displayListName}” from your lists? The list will stay available for other collaborators.`,
      'Leave',
      () => {
        const idToLeave = listId;
        goBack();
        void leaveListById(idToLeave, user).catch(() => {
          showAppAlert('Could not leave list', 'Please try again.');
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
          showAppAlert('Could not delete list', 'Please try again.');
        });
      },
    );
  };

  const handleMoveDoneToBottomChange = (value: boolean) => {
    if (readOnly) {
      showReadOnlyNotice();
      return;
    }
    if (!listId) {
      return;
    }

    setMoveDoneToBottom(value);
    void setListMoveDoneToBottom(listId, user, value)
      .then(() => {
        if (value) {
          return groupDoneItemsAtBottom();
        }
      })
      .catch(() => {
        setMoveDoneToBottom((current) => !value);
        showAppAlert('Could not update list', 'Please try again.');
      });
  };

  const handleChangeNewItemName = (text: string) => {
    newItemNameRef.current = text;
    setNewItemName(text);
  };

  const submitItemName = useCallback(
    (name: string) => {
      const trimmedName = name.trim();
      if (!listId || !trimmedName) {
        return;
      }

      const now = Date.now();
      const lastSubmit = lastAddSubmitRef.current;
      if (
        lastSubmit &&
        lastSubmit.name === trimmedName &&
        now - lastSubmit.at < 500
      ) {
        return;
      }
      lastAddSubmitRef.current = { name: trimmedName, at: now };

      const nameToAdd = trimmedName;
      playAddItemHaptic();
      newItemNameRef.current = '';
      setNewItemName('');
      refocusAddInput();

      void addOrMergeItems(nameToAdd)
        .then((recordedNames) => {
          for (const recordedName of recordedNames) {
            void recordName(recordedName);
          }
        })
        .catch(() => {
          newItemNameRef.current = nameToAdd;
          setNewItemName(nameToAdd);
          showAppAlert('Could not add item', 'Please try again.');
        });
    },
    [addOrMergeItems, listId, recordName, refocusAddInput],
  );

  const handleAddItem = useCallback(() => {
    submitItemName(newItemNameRef.current);
  }, [submitItemName]);

  const handleSubmitPressIn = () => {
    submitFromKeyboard.current = true;
    refocusingInput.current = true;
    setIsAddInputFocused(true);
  };

  const handleSelectSuggestion = useCallback(
    (suggestion: ItemSuggestion) => {
      const { checkedItemId, name } = suggestion;

      if (!checkedItemId) {
        submitItemName(name);
        return;
      }

      // The name is already on the list, just done — bring it back rather than
      // adding a second copy of it, at the top like a newly added item.
      playToggleHaptic();
      newItemNameRef.current = '';
      setNewItemName('');
      refocusAddInput();
      void restoreItem(checkedItemId).catch(() => {
        showAppAlert('Could not add item', 'Please try again.');
      });
      void recordName(name);
    },
    [recordName, refocusAddInput, restoreItem, submitItemName],
  );

  const suggestions = useMemo(
    () =>
      isAddInputFocused ? getItemSuggestions(newItemName, nameHistory, items) : [],
    [isAddInputFocused, items, nameHistory, newItemName],
  );

  const lockListItems = Platform.OS !== 'web' && isAddInputFocused;

  const handleInputFocus = () => {
    setIsAddInputFocused(true);
    placeCaretAtStart(addItemInputRef.current);
  };

  const handleInputBlur = () => {
    if (refocusingInput.current || submitFromKeyboard.current) {
      setIsAddInputFocused(true);
      return;
    }

    setTimeout(() => {
      if (refocusingInput.current || submitFromKeyboard.current) {
        setIsAddInputFocused(true);
        return;
      }

      setIsAddInputFocused(false);
      newItemNameRef.current = '';
      setNewItemName('');
    }, 0);
  };

  const handlePressItem = useCallback(
    (item: ListItem) => {
      if (readOnly) return;
      blurAddInput();
      if (!listId) {
        return;
      }
      router.push({
        pathname: '/list/[id]/item/[itemId]',
        params: { id: listId, itemId: item.id },
      });
    },
    [blurAddInput, listId, readOnly],
  );

  const handleToggleItem = useCallback(
    (id: string) => {
      if (readOnly) return;
      blurAddInput();
      void toggleItem(id);
    },
    [blurAddInput, readOnly, toggleItem],
  );

  const handleToggleSubItem = useCallback(
    (itemId: string, subId: string) => {
      if (readOnly) return;
      void toggleSubItem(itemId, subId);
    },
    [readOnly, toggleSubItem],
  );

  const handleReorder = useCallback(
    async (orderedItems: ListItem[]) => {
      try {
        await reorderItems(orderedItems);
      } catch (error) {
        showAppAlert('Could not reorder items', 'Please try again.');
        throw error;
      }
    },
    [reorderItems],
  );

  const handleReorderWithChecked = useCallback(
    async (orderedItems: ListItem[]) => {
      try {
        await applyItemLayout(orderedItems);
      } catch (error) {
        showAppAlert('Could not reorder items', 'Please try again.');
        throw error;
      }
    },
    [applyItemLayout],
  );

  const isItemDraggable = useCallback(
    (item: ListItem) => !isOptimisticListItem(item),
    [],
  );

  const listContentStyle = useMemo(
    () => [
      styles.listContent,
      {
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
      },
    ],
    [spacing.lg, spacing.xl],
  );

  const emptyList = (
    <View style={styles.emptyList}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={colorScheme === 'dark' ? darkListEmptyStateImage : lightListEmptyStateImage}
        style={styles.emptyListImage}
      />
      <Text style={[typography.body, styles.emptyText, { color: colors.textSecondary }]}>
        No items yet. Add your first one above.
      </Text>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.screen,
        { backgroundColor: colors.bg },
        slideTransitionEnabled ? animatedStyle : null,
        listOptionsVisible ? styles.screenMenuOpen : null,
      ]}
    >
      <View
        // Everything but the emoji sheet: a touch here closes the sheet.
        onTouchStart={onContentTouchStart}
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        enabled={isAddInputFocused}
        style={styles.flex}
      >
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.md,
          },
          listOptionsVisible ? styles.headerMenuOpen : null,
        ]}
      >
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            if (listOptionsVisible) {
              setListOptionsVisible(false);
              return;
            }

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
          <MaterialIcons color={colors.primary} name="chevron-left" size={24} />
        </Pressable>

        {/* The emoji opens the emoji sheet; the name is edited in place. */}
        <View style={styles.titleBlock}>
          {/* The same button as the new list modal's, highlighted while the
              sheet is open. */}
          <View onTouchStart={onToggleTouchStart}>
            <EmojiPickerButton
              emojiSize={styles.emoji.fontSize}
              expanded={emojiPickerOpen}
              onPress={handleToggleEmojiPicker}
              value={currentListEmoji}
            />
          </View>
          <View style={styles.titleTextBlock}>
            {editingTitle ? (
              <ThemedTextInput
                accessibilityLabel="List name"
                autoFocus
                maxLength={LIST_NAME_MAX_LENGTH}
                onBlur={handleFinishEditingTitle}
                onChangeText={setTitleDraft}
                returnKeyType="done"
                style={[typography.h2, styles.title, styles.titleInput, { color: colors.text }]}
                value={titleDraft}
                variant="plain"
              />
            ) : (
              <Pressable
                accessibilityHint="Edits the list name"
                accessibilityLabel={currentListName || 'List'}
                accessibilityRole="button"
                onPress={handleStartEditingTitle}
                style={({ pressed }) => [
                  { opacity: pressed ? 0.7 : 1 },
                  Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                ]}
              >
                <Text
                  numberOfLines={2}
                  style={[typography.h2, styles.title, { color: colors.text }]}
                >
                  {currentListName || 'List'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <ListOptionsMenu
          moveDoneToBottom={moveDoneToBottom}
          onClearList={handleClearList}
          onDeleteList={handleDeleteList}
          onInvite={handleShare}
          onLeaveList={handleLeaveList}
          onMoveDoneToBottomChange={handleMoveDoneToBottomChange}
          onOpen={blurAddInput}
          onVisibleChange={setListOptionsVisible}
          showDeleteList={canDeleteList}
          showLeaveList={canLeaveList}
          visible={listOptionsVisible}
        />
      </View>

      {listOptionsVisible ? (
        <Pressable
          accessibilityLabel="Close list options"
          accessibilityRole="button"
          onPress={() => setListOptionsVisible(false)}
          style={styles.menuBackdrop}
        />
      ) : null}

      {readOnly ? (
        <View
          style={[
            styles.readOnlyBanner,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              borderRadius: radii.item,
              marginHorizontal: spacing.lg,
              marginTop: spacing.lg,
              padding: spacing.md,
            },
          ]}
        >
          <MaterialIcons color={colors.textSecondary} name="lock-outline" size={20} />
          <Text style={[typography.label, styles.readOnlyText, { color: colors.textSecondary }]}>
            Read-only on the Free plan
          </Text>
          {isPurchasesAvailable() ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() =>
                router.push({ pathname: '/(auth)/paywall', params: { from: 'settings' } })
              }
            >
              <Text style={[typography.label, styles.readOnlyUpgrade, { color: colors.primary }]}>
                Upgrade
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.addInputWrapper}>
          <AddInputRow
            ref={addItemInputRef}
            focused={isAddInputFocused}
            nativeID={ADD_INPUT_ROW_NATIVE_ID}
            onBlur={handleInputBlur}
            onChangeText={handleChangeNewItemName}
            onFocus={handleInputFocus}
            onPressRow={focusAddInput}
            onSubmit={handleAddItem}
            onSubmitPressIn={handleSubmitPressIn}
            placeholder="Add an item..."
            style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg }}
            submitAccessibilityLabel="Add item"
            value={newItemName}
          />
          <AddItemSuggestions
            onPressIn={handleSubmitPressIn}
            onSelect={handleSelectSuggestion}
            suggestions={suggestions}
          />
        </View>
      )}

      <Animated.View style={[styles.listContainer, listFadeStyle]}>
        <Pressable onPress={handleBackgroundPress} style={styles.flex}>
          <ReorderableItemList
            contentContainerStyle={listContentStyle}
            disabled={lockListItems || readOnly}
            isItemDraggable={isItemDraggable}
            items={items}
            ListEmptyComponent={emptyList}
            moveDoneToBottom={moveDoneToBottom}
            onPressItem={handlePressItem}
            onReorder={handleReorder}
            onReorderWithChecked={handleReorderWithChecked}
            onToggleItem={handleToggleItem}
            onToggleSubItem={handleToggleSubItem}
          />
        </Pressable>
      </Animated.View>

      </KeyboardAvoidingView>
      </View>

      {/* Sits outside the safe-area and keyboard wrappers so it spans the
          screen and slides up from its bottom edge. */}
      {listId ? (
        <EmojiPickerSheet
          keyboardHeight={keyboardHeight}
          onClose={() => setEmojiPickerOpen(false)}
          onSelect={handleSelectEmoji}
          selected={currentListEmoji}
          visible={emojiPickerOpen}
        />
      ) : null}
    </Animated.View>
  );
}
