import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BottomSheet from '@/components/BottomSheet';
import EmptyState from '@/components/EmptyState';
import EmojiPickerButton from '@/components/EmojiPickerButton';
import ListCard from '@/components/ListCard';
import { useTheme } from '@/contexts/ThemeContext';
import { useLists } from '@/hooks/useLists';

const DEFAULT_EMOJI = '📋';

function formatSummary(listCount: number, sharedCount: number): string {
  const listLabel = listCount === 1 ? '1 list' : `${listCount} lists`;
  if (sharedCount === 0) {
    return listLabel;
  }
  const sharedLabel = sharedCount === 1 ? '1 shared' : `${sharedCount} shared`;
  return `${listLabel} · ${sharedLabel}`;
}

export default function ListsHomeScreen() {
  const { colors, radii, spacing } = useTheme();
  const { lists, loading, createList } = useLists();
  const [modalVisible, setModalVisible] = useState(false);
  const [listName, setListName] = useState('');
  const [listEmoji, setListEmoji] = useState(DEFAULT_EMOJI);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sharedCount = useMemo(
    () => lists.filter((list) => list.memberIds.length > 1).length,
    [lists],
  );

  const summary = formatSummary(lists.length, sharedCount);

  const openCreateModal = () => {
    setListName('');
    setListEmoji(DEFAULT_EMOJI);
    setError(null);
    setModalVisible(true);
  };

  const closeCreateModal = () => {
    if (creating) {
      return;
    }
    setModalVisible(false);
    setError(null);
  };

  const handleCreateList = async () => {
    const trimmedName = listName.trim();
    if (!trimmedName) {
      setError('Please enter a list name.');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await createList(trimmedName, listEmoji);
      setModalVisible(false);
      setListName('');
      setListEmoji(DEFAULT_EMOJI);
    } catch {
      setError('Could not create list. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
        <View style={styles.headerTop}>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: colors.text }]}>Lists</Text>
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
                borderColor: colors.border,
                borderRadius: radii.item,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialIcons color={colors.accent} name="settings" size={24} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : lists.length === 0 ? (
        <EmptyState onCreateList={openCreateModal} />
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
          ]}
          data={lists}
          keyExtractor={(item) => item.id}
          ListFooterComponent={
            <Pressable
              accessibilityLabel="Create new list"
              accessibilityRole="button"
              onPress={openCreateModal}
              style={({ pressed }) => [
                styles.createListButton,
                {
                  borderColor: colors.border,
                  borderRadius: radii.item,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.createListButtonContent}>
                <MaterialIcons color={colors.text} name="add" size={20} />
                <Text style={[styles.createListButtonText, { color: colors.text }]}>
                  Create new list
                </Text>
              </View>
            </Pressable>
          }
          renderItem={({ item }) => <ListCard list={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <BottomSheet
        blocking={creating}
        onClose={closeCreateModal}
        visible={modalVisible}
      >
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderTopLeftRadius: radii.card,
              borderTopRightRadius: radii.card,
              padding: spacing.lg,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            New list
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Name
            </Text>
            <View style={styles.nameRow}>
              <EmojiPickerButton
                disabled={creating}
                onChange={setListEmoji}
                value={listEmoji}
              />
              <TextInput
                autoFocus
                editable={!creating}
                onChangeText={setListName}
                onSubmitEditing={handleCreateList}
                placeholder="Groceries, packing, gifts..."
                placeholderTextColor={colors.textSecondary}
                returnKeyType="done"
                style={[
                  styles.input,
                  styles.nameInput,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                    borderRadius: radii.item,
                    color: colors.text,
                  },
                ]}
                value={listName}
              />
            </View>
          </View>

          {error ? (
            <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
          ) : null}

          <View style={[styles.modalActions, { gap: spacing.sm, marginTop: spacing.md }]}>
            <Pressable
              disabled={creating}
              onPress={closeCreateModal}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  borderColor: colors.border,
                  borderRadius: radii.item,
                  opacity: pressed || creating ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={creating}
              onPress={handleCreateList}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: colors.accent,
                  borderRadius: radii.item,
                  opacity: pressed || creating ? 0.85 : 1,
                },
              ]}
            >
              {creating ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: colors.surface }]}>
                  Create
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    borderWidth: 1,
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
  listContent: {
    flexGrow: 1,
  },
  createListButton: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    width: '100%',
  },
  createListButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  createListButtonText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
  },
  modalSheet: {
    borderTopWidth: 1,
    gap: 16,
  },
  modalTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
  },
  field: {
    gap: 6,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  nameInput: {
    flex: 1,
  },
  label: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  error: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
  },
  secondaryButton: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
  },
  primaryButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
  },
});
