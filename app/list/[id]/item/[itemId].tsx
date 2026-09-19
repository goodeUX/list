import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import DraggableFlatList, {
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ThemedTextInput from '@/components/ThemedTextInput';
import {
  addSubItem,
  createSubItemId,
  removeSubItem,
  renameSubItem,
  reorderSubItems,
  sortSubItems,
} from '@/lib/subItems';
import { playToggleHaptic } from '@/lib/haptics';
import type { SubItem } from '@/lib/types';
import { useTheme } from '@/contexts/ThemeContext';
import { showAppAlert } from '@/lib/appAlert';
import { buttonLabelStyle, buttonLayoutStyle } from '@/lib/buttonStyles';
import { useChildSlideTransition } from '@/hooks/useSlideTransition';
import { useListItems } from '@/hooks/useListItems';
import { isValidUrl, normalizeUrl } from '@/lib/urls';
import {
  ITEM_NAME_LIMIT_MESSAGE,
  getItemNameInputUpdate,
  normalizeItemName,
} from '@/lib/itemName';

export default function ItemDetailScreen() {
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId: string }>();
  const listId = typeof id === 'string' ? id : undefined;
  const resolvedItemId = typeof itemId === 'string' ? itemId : undefined;
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, loading, updateItem, deleteItem, setSubItems, toggleSubItem } =
    useListItems(listId);

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

  const subItems = item ? sortSubItems(item.subItems) : [];

  useEffect(() => {
    if (!item) {
      return;
    }

    setName(item.name);
    setQuantity(item.quantity ?? '');
    setDescription(item.description ?? '');
    setLink(item.link ?? '');
    setLinkError(null);
  }, [item]);

  const reportSaveError = () => {
    showAppAlert('Could not save', 'Please try again.');
  };

  // Every field auto-saves when it loses focus — there is no Save button.
  const commitName = () => {
    if (!item) {
      return;
    }
    const trimmed = normalizeItemName(name);
    if (!trimmed) {
      // An item must keep a name; restore the last saved value.
      setName(item.name);
      setNameLimitError(false);
      return;
    }
    if (trimmed !== item.name) {
      void updateItem(item.id, { name: trimmed }).catch(reportSaveError);
    }
  };

  const commitQuantity = () => {
    if (!item) {
      return;
    }
    const value = quantity.trim() || null;
    if (value !== (item.quantity ?? null)) {
      void updateItem(item.id, { quantity: value }).catch(reportSaveError);
    }
  };

  const commitDescription = () => {
    if (!item) {
      return;
    }
    const value = description.trim() || null;
    if (value !== (item.description ?? null)) {
      void updateItem(item.id, { description: value }).catch(reportSaveError);
    }
  };

  const commitLink = () => {
    if (!item) {
      return;
    }
    const trimmed = link.trim();
    if (trimmed && !isValidUrl(trimmed)) {
      setLinkError('Please enter a valid URL.');
      return;
    }
    setLinkError(null);
    const value = trimmed ? normalizeUrl(trimmed) : null;
    if (value !== (item.link ?? null)) {
      void updateItem(item.id, { link: value }).catch(reportSaveError);
    }
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
    const next = addSubItem(item.subItems, newSubItemName, createSubItemId());
    if (next === item.subItems) {
      return;
    }
    setNewSubItemName('');
    void setSubItems(item.id, next).catch(() => {
      showAppAlert('Could not add sub-item', 'Please try again.');
    });
  };

  const handleRenameSubItem = (subId: string, nextName: string) => {
    if (!item) {
      return;
    }
    const next = renameSubItem(item.subItems, subId, nextName);
    if (next === item.subItems) {
      return;
    }
    void setSubItems(item.id, next).catch(() => {
      showAppAlert('Could not rename sub-item', 'Please try again.');
    });
  };

  const handleRemoveSubItem = (subId: string) => {
    if (!item) {
      return;
    }
    setEditingSubId((current) => (current === subId ? null : current));
    void setSubItems(item.id, removeSubItem(item.subItems, subId)).catch(() => {
      showAppAlert('Could not remove sub-item', 'Please try again.');
    });
  };

  const handleToggleSubItem = (subId: string) => {
    if (!item) {
      return;
    }
    void toggleSubItem(item.id, subId).catch(() => {
      showAppAlert('Could not update sub-item', 'Please try again.');
    });
  };

  const handleReorderSubItems = (ordered: SubItem[]) => {
    if (!item) {
      return;
    }
    const next = reorderSubItems(
      item.subItems,
      ordered.map((entry) => entry.id),
    );
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
            <ActivityIndicator color={colors.accent} size="large" />
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
            <MaterialIcons color={colors.accent} name="chevron-left" size={24} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Edit item</Text>
          <View style={styles.shareButton} />
        </View>

        <View style={styles.flex}>
        <DraggableFlatList
          activationDistance={12}
          contentContainerStyle={[styles.content, { padding: spacing.lg }]}
          data={subItems}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(subItem) => subItem.id}
          ListHeaderComponent={
            <View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
                <ThemedTextInput
                  invalid={nameLimitError}
                  onBlur={commitName}
                  onChangeText={(text) => {
                    const { limitReached, value } = getItemNameInputUpdate(text);
                    setNameLimitError(limitReached);
                    setName(value);
                  }}
                  style={styles.nameInput}
                  value={name}
                />
                {nameLimitError ? (
                  <Text style={[styles.limitError, { color: colors.accent }]}>
                    {ITEM_NAME_LIMIT_MESSAGE}
                  </Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Quantity</Text>
                <ThemedTextInput
                  onBlur={commitQuantity}
                  onChangeText={setQuantity}
                  placeholder="e.g. 2 lbs, 1 pack"
                  value={quantity}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
                <ThemedTextInput
                  multiline
                  onBlur={commitDescription}
                  onChangeText={setDescription}
                  placeholder="Notes or details"
                  style={styles.textArea}
                  value={description}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Link</Text>
                <ThemedTextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  invalid={Boolean(linkError)}
                  keyboardType="url"
                  onBlur={commitLink}
                  onChangeText={(value) => {
                    setLink(value);
                    setLinkError(null);
                  }}
                  placeholder="https://..."
                  value={link}
                />
                {linkError ? (
                  <Text style={[styles.error, { color: colors.accent }]}>{linkError}</Text>
                ) : null}
                {link.trim() && isValidUrl(link) ? (
                  <Pressable onPress={handleOpenLink}>
                    <Text style={[styles.openLink, { color: colors.accent }]}>Open link</Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Sub-items</Text>
            </View>
          }
          ListFooterComponent={
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.deleteButton,
                buttonLayoutStyle,
                {
                  borderColor: colors.border,
                  marginTop: spacing.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[buttonLabelStyle(15), { color: colors.accent }]}>
                Delete item
              </Text>
            </Pressable>
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
                    setEditingSubId(subItem.id);
                  }
                }}
                style={[
                  styles.subItemRow,
                  {
                    backgroundColor: isActive ? colors.surfaceMuted : 'transparent',
                    borderRadius: radii.item,
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
                      borderRadius: radii.checkbox,
                    },
                  ]}
                >
                  {subItem.checked ? (
                    <MaterialIcons color={colors.surface} name="check" size={12} />
                  ) : null}
                </Pressable>

                {editing ? (
                  <ThemedTextInput
                    autoFocus
                    defaultValue={subItem.name}
                    onBlur={() =>
                      setEditingSubId((current) =>
                        current === subItem.id ? null : current,
                      )
                    }
                    onEndEditing={(event) =>
                      handleRenameSubItem(subItem.id, event.nativeEvent.text)
                    }
                    returnKeyType="done"
                    style={styles.subItemInput}
                    variant="plain"
                  />
                ) : (
                  <Text
                    numberOfLines={1}
                    style={[
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
                    <MaterialIcons color={colors.accent} name="delete-outline" size={20} />
                  </Pressable>
                ) : null}
              </Pressable>
            );
          }}
        />
        </View>

        <View
          style={[
            styles.addBar,
            {
              backgroundColor: colors.bg,
              borderTopColor: colors.border,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
            },
          ]}
        >
          <ThemedTextInput
            blurOnSubmit={false}
            onChangeText={setNewSubItemName}
            onSubmitEditing={handleAddSubItem}
            placeholder="Add a sub-item"
            returnKeyType="done"
            value={newSubItemName}
          />
        </View>
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
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
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
  headerTitle: {
    flex: 1,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  content: {
    flexGrow: 1,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
  },
  nameInput: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 22,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  error: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  limitError: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  openLink: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    marginTop: 4,
  },
  subItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  subItemCheckbox: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  subItemLabel: {
    flex: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 22,
  },
  subItemInput: {
    flex: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    paddingVertical: 6,
  },
  subItemAction: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  deleteButton: {
    borderWidth: 1,
    minHeight: 48,
  },
  addBar: {
    borderTopWidth: 1,
  },
});
