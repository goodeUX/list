import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import DraggableFlatList, {
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AddInputRow from '@/components/AddInputRow';
import ThemedTextInput from '@/components/ThemedTextInput';
import {
  addSubItems,
  removeSubItem,
  reorderSubItems,
  sortSubItems,
  toggleSubItem,
} from '@/lib/subItems';
import { scheduleAddItemInputFocus } from '@/lib/focusAddItemInput';
import { focusTextInputNow } from '@/lib/focusTextInput';
import { playAddItemHaptic, playToggleHaptic } from '@/lib/haptics';
import { radius, space } from '@/lib/design';
import { itemDetailStyles as styles } from '@/lib/itemDetailScreenStyles';
import { ITEM_CHECKBOX_ICON_SIZE } from '@/lib/itemRowMetrics';
import type { SubItem } from '@/lib/types';
import { useTheme } from '@/contexts/ThemeContext';
import { showAppAlert } from '@/lib/appAlert';
import { useChildSlideTransition } from '@/hooks/useSlideTransition';
import { useItemAutoSave } from '@/hooks/useItemAutoSave';
import { FIELD_KEYBOARD_GAP, useKeyboardPushScroll } from '@/hooks/useKeyboardPushScroll';
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
  const addInputRef = useRef<TextInput>(null);
  const [isAddInputFocused, setIsAddInputFocused] = useState(false);
  const refocusingAddInputRef = useRef(false);
  const lastAddSubmitRef = useRef<{ text: string; at: number } | null>(null);

  const subItems = item ? sortSubItems(item.subItems) : [];

  // The opening keyboard pushes whichever field is focused up above it.
  const {
    onScrollOffsetChange,
    onViewportTouchEnd,
    scrollRef: subItemsListRef,
    viewportRef,
    viewportStyle,
  } = useKeyboardPushScroll<FlatList<SubItem>>(insets.bottom);

  // Scroll the add-sub-item input (the list footer) back above the keyboard
  // after an add grows the list. scrollToOffset (a large offset clamps to the
  // end) is used because scrollToEnd is a no-op on this wrapped list ref.
  const scrollAddInputToBottom = () => {
    requestAnimationFrame(() => {
      subItemsListRef.current?.scrollToOffset({ offset: 100000, animated: true });
    });
  };

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

  // The add-sub-item field mirrors the list page's add-item field: a tick
  // appears once there's text, adding keeps the keyboard up for the next one,
  // and dismissing the field (blur without adding) discards what was typed.
  const refocusAddInput = () => {
    refocusingAddInputRef.current = true;
    setIsAddInputFocused(true);
    scheduleAddItemInputFocus(
      () => addInputRef.current,
      () => {
        setIsAddInputFocused(true);
        setTimeout(() => {
          refocusingAddInputRef.current = false;
        }, 200);
      },
    );
  };

  const handleAddSubItem = () => {
    if (!item) {
      return;
    }
    const typed = newSubItemName;
    const trimmed = typed.trim();
    const now = Date.now();
    const lastSubmit = lastAddSubmitRef.current;
    // The tick's press and the keyboard's submit can both fire for one add.
    if (lastSubmit && lastSubmit.text === trimmed && now - lastSubmit.at < 500) {
      return;
    }
    const base = withSubItemRenames(item.subItems);
    const next = addSubItems(base, typed);
    if (next === base) {
      return;
    }
    lastAddSubmitRef.current = { text: trimmed, at: now };
    commitSubItemRenames();
    playAddItemHaptic();
    setNewSubItemName('');
    refocusAddInput();
    void setSubItems(item.id, next)
      .then(scrollAddInputToBottom)
      .catch(() => {
        setNewSubItemName(typed);
        showAppAlert('Could not add sub-item', 'Please try again.');
      });
  };

  const handleAddInputPressIn = () => {
    refocusingAddInputRef.current = true;
    setIsAddInputFocused(true);
  };

  const handleAddInputFocus = () => {
    setIsAddInputFocused(true);
  };

  const handleAddInputBlur = () => {
    if (refocusingAddInputRef.current) {
      return;
    }
    setTimeout(() => {
      if (refocusingAddInputRef.current) {
        return;
      }
      setIsAddInputFocused(false);
      setNewSubItemName('');
    }, 0);
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
    // A tap outside the focused field ends editing it, checkboxes included.
    Keyboard.dismiss();
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
        // Tapping anywhere no button or field handles (labels, blank space,
        // the header) takes focus out of the field being edited. The list's
        // own keyboardShouldPersistTaps can't be relied on for this: it only
        // acts while RN thinks the keyboard is open, which Android
        // edge-to-edge and a back-button dismiss both defeat. A drag that
        // scrolls instead terminates this responder without releasing it.
        onResponderRelease={() => Keyboard.dismiss()}
        onStartShouldSetResponder={() => TextInput.State.currentlyFocusedInput() != null}
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

        <Animated.View
          ref={viewportRef}
          onTouchEnd={onViewportTouchEnd}
          style={[styles.flex, viewportStyle]}
        >
        <DraggableFlatList
          // DraggableFlatList forwards its ref to its inner Animated FlatList,
          // so an animated ref here lets Reanimated scroll it on the UI thread.
          // (Its ref type names gesture-handler's FlatList, hence the cast.)
          ref={subItemsListRef as never}
          activationDistance={12}
          containerStyle={styles.flex}
          style={styles.flex}
          // The bottom padding matches the keyboard gap, so after an add
          // scrolls to the end, the add input sits the same distance above
          // the keyboard as when the keyboard first pushed it up.
          contentContainerStyle={[
            styles.content,
            { padding: space[6], paddingBottom: FIELD_KEYBOARD_GAP },
          ]}
          data={subItems}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(subItem) => subItem.id}
          onScrollOffsetChange={onScrollOffsetChange}
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
              <AddInputRow
                ref={addInputRef}
                focused={isAddInputFocused}
                onBlur={handleAddInputBlur}
                onChangeText={setNewSubItemName}
                onFocus={handleAddInputFocus}
                onPressRow={() => focusTextInputNow(addInputRef.current)}
                onSubmit={handleAddSubItem}
                onSubmitPressIn={handleAddInputPressIn}
                placeholder="Add a sub-item..."
                submitAccessibilityLabel="Add sub-item"
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
                  if (editing) {
                    // A tap on the row around the field being edited.
                    Keyboard.dismiss();
                    return;
                  }
                  setEditingSubName(subItem.name);
                  setEditingSubId(subItem.id);
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
                    <MaterialIcons
                      color={colors.onPrimary}
                      name="check"
                      size={ITEM_CHECKBOX_ICON_SIZE}
                    />
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
        </Animated.View>
      </KeyboardAvoidingView>
      </View>
    </Animated.View>
  );
}
