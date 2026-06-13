import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, onSnapshot } from 'firebase/firestore';

import ShareSheet from '@/components/ShareSheet';
import SwipeableListItemRow from '@/components/SwipeableListItemRow';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useItemHistory } from '@/hooks/useItemHistory';
import { useListItems } from '@/hooks/useListItems';
import { usePresence } from '@/hooks/usePresence';
import { db } from '@/lib/firebase';
import { getLocalList, subscribeLocalData } from '@/lib/localStore';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = typeof id === 'string' ? id : undefined;
  const { user } = useAuth();
  const { colors, radii, spacing } = useTheme();
  const { items, loading, addItem, toggleItem, deleteItem } = useListItems(listId);
  const { recordItemUsage } = useItemHistory();
  const { activeUsers } = usePresence(user ? listId : undefined);
  const [listName, setListName] = useState('');
  const [listEmoji, setListEmoji] = useState('📋');
  const [newItemName, setNewItemName] = useState('');
  const [adding, setAdding] = useState(false);
  const [isAddInputFocused, setIsAddInputFocused] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
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

  const blurAddInput = () => {
    addItemInputRef.current?.blur();
    setIsAddInputFocused(false);
  };

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
        } else {
          setListName('');
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

    const unsubscribe = onSnapshot(doc(db, 'lists', listId), (snapshot) => {
      if (!snapshot.exists()) {
        setListName('');
        return;
      }

      const data = snapshot.data();
      setListName((data.name as string) ?? '');
      setListEmoji((data.emoji as string) ?? '📋');
    });

    return unsubscribe;
  }, [listId, user]);

  const doneCount = useMemo(
    () => items.filter((item) => item.checked).length,
    [items],
  );
  const totalCount = items.length;

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

  const handleAddItem = async (refocusAfter = false) => {
    const trimmedName = newItemName.trim();
    if (!listId || !trimmedName || adding) {
      return;
    }

    setAdding(true);
    try {
      await addItem(trimmedName);
      await recordItemUsage(trimmedName, null, listId);
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

  const handleInputFocus = () => {
    setIsAddInputFocused(true);
    placeCaretAtStart(addItemInputRef.current);
  };

  const handleInputBlur = () => {
    if (refocusingInput.current) {
      return;
    }

    if (submitFromKeyboard.current) {
      submitFromKeyboard.current = false;
      return;
    }

    setIsAddInputFocused(false);
    void handleAddItem(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.lg,
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
            router.back();
          }}
          style={({ pressed }) => [
            styles.iconButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.backText, { color: colors.accent }]}>←</Text>
        </Pressable>

        <View style={styles.titleBlock}>
          <Text style={styles.emoji}>{listEmoji}</Text>
          <View style={styles.titleTextBlock}>
            <Text
              numberOfLines={2}
              style={[styles.title, { color: colors.text }]}
            >
              {listName || 'List'}
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

        <Pressable
          accessibilityLabel="Share list"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            blurAddInput();
            handleShare();
          }}
          style={({ pressed }) => [
            styles.iconButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.shareText, { color: colors.accent }]}>↗</Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.addSection,
          { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
        ]}
      >
        <TextInput
          ref={addItemInputRef}
          cursorColor={colors.accent}
          editable={!adding}
          onBlur={handleInputBlur}
          onChangeText={setNewItemName}
          onFocus={handleInputFocus}
          onSubmitEditing={handleSubmitEditing}
          placeholder="Add an item..."
          placeholderTextColor={colors.textSecondary}
          returnKeyType="done"
          selectionColor={colors.accentSoft}
          style={[
            styles.addInput,
            {
              backgroundColor: isAddInputFocused ? colors.surfaceMuted : colors.surface,
              borderColor: isAddInputFocused ? colors.accent : colors.border,
              borderRadius: radii.item,
              color: colors.text,
              ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
            },
          ]}
          value={newItemName}
        />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: spacing.xl,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.sm,
            },
          ]}
          data={items}
          ItemSeparatorComponent={() => (
            <View
              style={[
                styles.itemSeparator,
                { backgroundColor: colors.border },
              ]}
            />
          )}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No items yet. Add your first one above.
            </Text>
          }
          renderItem={({ item }) => (
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
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.border,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
          },
        ]}
      >
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {doneCount} of {totalCount} complete
        </Text>
      </View>

      {listId ? (
        <ShareSheet
          listId={listId}
          listName={listName || 'List'}
          onClose={() => setShareSheetVisible(false)}
          visible={shareSheetVisible}
        />
      ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  iconButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  backText: {
    fontSize: 22,
    lineHeight: 24,
  },
  shareText: {
    fontSize: 20,
    lineHeight: 24,
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
  addInput: {
    borderWidth: 2,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
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
  footer: {
    borderTopWidth: 1,
  },
  footerText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
