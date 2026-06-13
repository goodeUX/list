import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
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

import ListItemRow from '@/components/ListItemRow';
import { useTheme } from '@/contexts/ThemeContext';
import { useListItems } from '@/hooks/useListItems';
import { db } from '@/lib/firebase';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = typeof id === 'string' ? id : undefined;
  const { colors, radii, spacing } = useTheme();
  const { items, loading, addItem, toggleItem } = useListItems(listId);
  const [listName, setListName] = useState('');
  const [listEmoji, setListEmoji] = useState('📋');
  const [newItemName, setNewItemName] = useState('');
  const [adding, setAdding] = useState(false);
  const submitFromKeyboard = useRef(false);

  useEffect(() => {
    if (!listId) {
      return;
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
  }, [listId]);

  const doneCount = useMemo(
    () => items.filter((item) => item.checked).length,
    [items],
  );
  const totalCount = items.length;

  const handleAddItem = async () => {
    const trimmedName = newItemName.trim();
    if (!trimmedName || adding) {
      return;
    }

    setAdding(true);
    try {
      await addItem(trimmedName);
      setNewItemName('');
    } finally {
      setAdding(false);
    }
  };

  const handleSubmitEditing = () => {
    submitFromKeyboard.current = true;
    void handleAddItem();
  };

  const handleBlur = () => {
    if (submitFromKeyboard.current) {
      submitFromKeyboard.current = false;
      return;
    }
    void handleAddItem();
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
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              size={22}
              tintColor={colors.accent}
            />
          </Pressable>

          <View style={styles.titleBlock}>
            <Text style={styles.emoji}>{listEmoji}</Text>
            <Text
              numberOfLines={2}
              style={[styles.title, { color: colors.text }]}
            >
              {listName || 'List'}
            </Text>
          </View>
        </View>

        <View style={[styles.addSection, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
          <TextInput
            editable={!adding}
            onBlur={handleBlur}
            onChangeText={setNewItemName}
            onSubmitEditing={handleSubmitEditing}
            placeholder="Add an item..."
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            style={[
              styles.addInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.item,
                color: colors.text,
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
                gap: spacing.sm,
                paddingBottom: spacing.xl,
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.sm,
              },
            ]}
            data={items}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No items yet. Add your first one above.
              </Text>
            }
            renderItem={({ item }) => (
              <ListItemRow
                item={item}
                onPress={() => {}}
                onToggle={() => {
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
  backButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  titleBlock: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    paddingRight: 36,
  },
  emoji: {
    fontSize: 28,
    lineHeight: 32,
  },
  title: {
    flex: 1,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
  },
  addSection: {
    gap: 8,
  },
  addInput: {
    borderWidth: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    flexGrow: 1,
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
