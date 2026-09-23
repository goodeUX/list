import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  KeyboardState,
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedReaction,
} from 'react-native-reanimated';
import DraggableFlatList, {
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ThemedTextInput from '@/components/ThemedTextInput';
import {
  addSubItem,
  createSubItemId,
  removeSubItem,
  reorderSubItems,
  sortSubItems,
  toggleSubItem,
} from '@/lib/subItems';
import { playToggleHaptic } from '@/lib/haptics';
import { radius, space } from '@/lib/design';
import { itemDetailStyles as styles } from '@/lib/itemDetailScreenStyles';
import type { SubItem } from '@/lib/types';
import { useTheme } from '@/contexts/ThemeContext';
import { showAppAlert } from '@/lib/appAlert';
import { useChildSlideTransition } from '@/hooks/useSlideTransition';
import { useItemAutoSave } from '@/hooks/useItemAutoSave';
import { useListItems } from '@/hooks/useListItems';
import { isValidUrl, normalizeUrl } from '@/lib/urls';
import { ITEM_NAME_LIMIT_MESSAGE, getItemNameInputUpdate } from '@/lib/itemName';
import {
  ITEM_TEXT_FIELDS,
  draftAfterStoredChange,
  savableFieldValue,
  storedFieldValue,
  type ItemTextField,
  type StoredFieldValue,
} from '@/lib/itemDraft';

export default function ItemDetailScreen() {
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId: string }>();
  const listId = typeof id === 'string' ? id : undefined;
  const resolvedItemId = typeof itemId === 'string' ? itemId : undefined;
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, loading, updateItem, deleteItem, setSubItems } = useListItems(listId);

  const item = items.find((entry) => entry.id === resolvedItemId);
  const { animatedStyle, goBack, isEnabled: slideTransitionEnabled } =
    useChildSlideTransition({ ready: !loading && Boolean(item) });

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [nameLimitError, setNameLimitError] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [newSubItemName, setNewSubItemName] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const subItemsListRef = useRef<FlatList<SubItem> | null>(null);
  const addInputRef = useRef<TextInput>(null);
  const addInputFocusedRef = useRef(false);

  const subItems = item ? sortSubItems(item.subItems) : [];

  // Scroll the add-sub-item input (the list footer) to the bottom of the
  // scroll area. Combined with the keyboard-height bottom padding below, this
  // lifts it above the keyboard. scrollToOffset (a large offset clamps to the
  // end) is used because scrollToEnd is a no-op on this wrapped list ref.
  const scrollAddInputToBottom = () => {
    requestAnimationFrame(() => {
      subItemsListRef.current?.scrollToOffset({ offset: 100000, animated: true });
    });
  };

  // Read the keyboard from Reanimated (window insets), which stays reliable
  // under Android edge-to-edge where the RN Keyboard events report height 0.
  // Bridge its height to state so the list can pad its bottom accordingly.
  // Without these, useAnimatedKeyboard takes over the Android window insets and
  // makes the status/navigation bars opaque (white bars) and shifts the header.
  // Keeping the bars translucent preserves the app's edge-to-edge layout.
  const keyboard = useAnimatedKeyboard({
    isNavigationBarTranslucentAndroid: true,
    isStatusBarTranslucentAndroid: true,
  });
  useAnimatedReaction(
    () => keyboard.state.value,
    (state, previous) => {
      if (state === previous) {
        return;
      }
      if (state === KeyboardState.OPEN) {
        runOnJS(setKeyboardHeight)(keyboard.height.value);
      } else if (state === KeyboardState.CLOSED) {
        runOnJS(setKeyboardHeight)(0);
      }
    },
  );

  // Once the keyboard height has been applied as bottom padding (this runs
  // after that re-render), scroll the focused input above the keyboard: the
  // edited sub-item row, or the add input at the bottom. DraggableFlatList
  // overrides onContentSizeChange, so this effect — not that prop — drives it.
  useEffect(() => {
    if (keyboardHeight <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      if (editingSubId) {
        const index = subItems.findIndex((entry) => entry.id === editingSubId);
        if (index >= 0) {
          subItemsListRef.current?.scrollToIndex({
            animated: true,
            index,
            viewPosition: 0,
          });
        }
      } else if (addInputFocusedRef.current) {
        subItemsListRef.current?.scrollToOffset({ offset: 100000, animated: true });
      }
    }, 50);
    return () => clearTimeout(timer);
    // subItems is read fresh at run time; adding it would re-run this on every
    // keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardHeight, editingSubId]);

  const reportSaveError = () => {
    showAppAlert('Could not save', 'Please try again.');
  };

  // Every field auto-saves as you type — there is no Save button.
  const {
    commitSubItemRenames,
    discard: discardPendingSaves,
    flush: flushSaves,
    isFieldDirty,
    queueField,
    queueSubItemRename,
    withSubItemRenames,
  } = useItemAutoSave({ item, updateItem, onError: reportSaveError });

  // Copy stored values into the fields when they change — on load, or when
  // someone else edits the item — but never over an edit still being saved.
  const lastStoredRef = useRef(new Map<ItemTextField, StoredFieldValue>());
  useEffect(() => {
    if (!item) {
      return;
    }
    const setters = {
      description: setDescription,
      link: setLink,
      name: setName,
      quantity: setQuantity,
    };
    const lastStored = lastStoredRef.current;
    ITEM_TEXT_FIELDS.forEach((field) => {
      const stored = storedFieldValue(item, field);
      if (lastStored.has(field) && lastStored.get(field) === stored) {
        return;
      }
      lastStored.set(field, stored);
      if (isFieldDirty(field)) {
        return;
      }
      setters[field]((draft) => draftAfterStoredChange(field, draft, stored));
      if (field === 'link') {
        setLinkError(null);
      }
    });
  }, [isFieldDirty, item]);

  const handleNameBlur = () => {
    if (item && savableFieldValue('name', name) === undefined) {
      // An item must keep a name; restore the last saved value.
      setName(item.name);
      setNameLimitError(false);
    }
    flushSaves();
  };

  const handleLinkBlur = () => {
    if (savableFieldValue('link', link) === undefined) {
      setLinkError('Please enter a valid URL.');
    }
    flushSaves();
  };

  const handleOpenLink = async () => {
    const normalized = normalizeUrl(link);
    if (!normalized) {
      return;
    }
    await WebBrowser.openBrowserAsync(normalized);
  };

  const handleDelete = () => {
    if (!item) {
      return;
    }

    const runDelete = () => {
      discardPendingSaves();
      void deleteItem(item.id).then(() => goBack());
    };

    showAppAlert('Delete item', `Remove "${item.name}" from this list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: runDelete,
      },
    ]);
  };

  const handleAddSubItem = () => {
    if (!item) {
      return;
    }
    const base = withSubItemRenames(item.subItems);
    const next = addSubItem(base, newSubItemName, createSubItemId());
    if (next === base) {
      return;
    }
    commitSubItemRenames();
    setNewSubItemName('');
    // Keep the keyboard up so several can be added in a row; the list re-render
    // after the write can drop focus, so re-focus explicitly.
    requestAnimationFrame(() => addInputRef.current?.focus());
    void setSubItems(item.id, next)
      .then(scrollAddInputToBottom)
      .catch(() => {
        showAppAlert('Could not add sub-item', 'Please try again.');
      });
  };

  const handleRemoveSubItem = (subId: string) => {
    if (!item) {
      return;
    }
    setEditingSubId((current) => (current === subId ? null : current));
    const next = removeSubItem(withSubItemRenames(item.subItems), subId);
    commitSubItemRenames();
    void setSubItems(item.id, next).catch(() => {
      showAppAlert('Could not remove sub-item', 'Please try again.');
    });
  };

  const handleToggleSubItem = (subId: string) => {
    if (!item) {
      return;
    }
    const next = toggleSubItem(withSubItemRenames(item.subItems), subId);
    commitSubItemRenames();
    void setSubItems(item.id, next).catch(() => {
      showAppAlert('Could not update sub-item', 'Please try again.');
    });
  };

  const handleReorderSubItems = (ordered: SubItem[]) => {
    if (!item) {
      return;
    }
    const next = reorderSubItems(
      withSubItemRenames(item.subItems),
      ordered.map((entry) => entry.id),
    );
    commitSubItemRenames();
    if (Platform.OS !== 'web') {
      playToggleHaptic();
    }
    void setSubItems(item.id, next).catch(() => {
      showAppAlert('Could not reorder sub-items', 'Please try again.');
    });
  };

  if (loading || !item) {
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
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        </View>
      </Animated.View>
    );
  }

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
      <KeyboardAvoidingView behavior={undefined} style={styles.flex}>
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              paddingHorizontal: space[6],
              paddingTop: space[4],
              paddingBottom: space[4],
            },
          ]}
        >
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => goBack()}
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
          <Text style={[typography.h2, styles.headerTitle, { color: colors.text }]}>
            Edit item
          </Text>
          <Pressable
            accessibilityLabel="Delete item"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.shareButton,
              {
                backgroundColor: colors.surface,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialIcons color={colors.primary} name="delete-outline" size={22} />
          </Pressable>
        </View>

        <DraggableFlatList
          // DraggableFlatList forwards its ref to a gesture-handler FlatList,
          // whose instance still exposes RN FlatList's scrollToOffset. A
          // callback ref bridges the two FlatList component types.
          ref={(instance) => {
            subItemsListRef.current = (instance ?? null) as unknown as
              | FlatList<SubItem>
              | null;
          }}
          activationDistance={12}
          containerStyle={styles.flex}
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { padding: space[6], paddingBottom: space[6] + keyboardHeight },
          ]}
          data={subItems}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(subItem) => subItem.id}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            subItemsListRef.current?.scrollToOffset({
              animated: true,
              offset: averageItemLength * index,
            });
          }}
          ListHeaderComponent={
            <View style={{ gap: space[4], marginBottom: space[2] }}>
              <View style={styles.field}>
                <Text style={[typography.label, styles.label, { color: colors.textSecondary }]}>
                  Name
                </Text>
                <ThemedTextInput
                  invalid={nameLimitError}
                  onBlur={handleNameBlur}
                  onChangeText={(text) => {
                    const { limitReached, value } = getItemNameInputUpdate(text);
                    setNameLimitError(limitReached);
                    setName(value);
                    queueField('name', value);
                  }}
                  style={styles.nameInput}
                  value={name}
                />
                {nameLimitError ? (
                  <Text style={[typography.bodyS, styles.limitError, { color: colors.primary }]}>
                    {ITEM_NAME_LIMIT_MESSAGE}
                  </Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={[typography.label, styles.label, { color: colors.textSecondary }]}>
                  Quantity
                </Text>
                <ThemedTextInput
                  onBlur={flushSaves}
                  onChangeText={(value) => {
                    setQuantity(value);
                    queueField('quantity', value);
                  }}
                  placeholder="e.g. 2 lbs, 1 pack"
                  value={quantity}
                />
              </View>

              <View style={styles.field}>
                <Text style={[typography.label, styles.label, { color: colors.textSecondary }]}>
                  Description
                </Text>
                <ThemedTextInput
                  multiline
                  onBlur={flushSaves}
                  onChangeText={(value) => {
                    setDescription(value);
                    queueField('description', value);
                  }}
                  placeholder="Notes or details"
                  style={styles.textArea}
                  value={description}
                />
              </View>

              <View style={styles.field}>
                <Text style={[typography.label, styles.label, { color: colors.textSecondary }]}>
                  Link
                </Text>
                <ThemedTextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  invalid={Boolean(linkError)}
                  keyboardType="url"
                  onBlur={handleLinkBlur}
                  onChangeText={(value) => {
                    setLink(value);
                    setLinkError(null);
                    queueField('link', value);
                  }}
                  placeholder="https://..."
                  value={link}
                />
                {linkError ? (
                  <Text style={[typography.bodyS, styles.error, { color: colors.primary }]}>
                    {linkError}
                  </Text>
                ) : null}
                {link.trim() && isValidUrl(link) ? (
                  <Pressable onPress={handleOpenLink}>
                    <Text style={[typography.label, styles.openLink, { color: colors.primary }]}>
                      Open link
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={[typography.label, styles.label, { color: colors.textSecondary }]}>
                Sub-items
              </Text>
            </View>
          }
          ListFooterComponent={
            <View style={{ marginTop: space[2] }}>
              <ThemedTextInput
                ref={addInputRef}
                onBlur={() => {
                  addInputFocusedRef.current = false;
                }}
                onChangeText={setNewSubItemName}
                onFocus={() => {
                  addInputFocusedRef.current = true;
                  scrollAddInputToBottom();
                }}
                onSubmitEditing={handleAddSubItem}
                placeholder="Add a sub-item"
                returnKeyType="done"
                submitBehavior="submit"
                value={newSubItemName}
              />
            </View>
          }
          onDragEnd={({ data }) => handleReorderSubItems(data)}
          renderItem={({ item: subItem, drag, isActive }: RenderItemParams<SubItem>) => {
            const editing = editingSubId === subItem.id;

            return (
              <Pressable
                delayLongPress={250}
                onLongPress={
                  editing
                    ? undefined
                    : () => {
                        if (Platform.OS !== 'web') {
                          playToggleHaptic();
                        }
                        drag();
                      }
                }
                onPress={() => {
                  if (!editing) {
                    setEditingSubName(subItem.name);
                    setEditingSubId(subItem.id);
                  }
                }}
                style={[
                  styles.subItemRow,
                  {
                    backgroundColor: isActive ? colors.surfaceMuted : 'transparent',
                    borderRadius: radius.md,
                  },
                ]}
              >
                <Pressable
                  accessibilityLabel={subItem.checked ? 'Mark incomplete' : 'Mark complete'}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: subItem.checked }}
                  hitSlop={8}
                  onPress={() => handleToggleSubItem(subItem.id)}
                  style={[
                    styles.subItemCheckbox,
                    {
                      backgroundColor: subItem.checked ? colors.success : 'transparent',
                      borderColor: subItem.checked ? colors.success : colors.border,
                      borderRadius: radius.sm,
                    },
                  ]}
                >
                  {subItem.checked ? (
                    <MaterialIcons color={colors.onPrimary} name="check" size={12} />
                  ) : null}
                </Pressable>

                {editing ? (
                  <ThemedTextInput
                    autoFocus
                    onBlur={() => {
                      flushSaves();
                      setEditingSubId((current) =>
                        current === subItem.id ? null : current,
                      );
                    }}
                    onChangeText={(value) => {
                      setEditingSubName(value);
                      queueSubItemRename(subItem.id, value);
                    }}
                    returnKeyType="done"
                    style={styles.subItemInput}
                    value={editingSubName}
                    variant="plain"
                  />
                ) : (
                  <Text
                    numberOfLines={1}
                    style={[
                      typography.body,
                      styles.subItemLabel,
                      {
                        color: subItem.checked ? colors.textSecondary : colors.text,
                        textDecorationLine: subItem.checked ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {subItem.name}
                  </Text>
                )}

                {editing ? (
                  <Pressable
                    accessibilityLabel="Delete sub-item"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => handleRemoveSubItem(subItem.id)}
                    style={styles.subItemAction}
                  >
                    <MaterialIcons color={colors.primary} name="delete-outline" size={20} />
                  </Pressable>
                ) : null}
              </Pressable>
            );
          }}
        />
      </KeyboardAvoidingView>
      </View>
    </Animated.View>
  );
}
