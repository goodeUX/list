import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmptyState from '@/components/EmptyState';
import Fab from '@/components/Fab';
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
        <Text style={[styles.title, { color: colors.text }]}>Lists</Text>
        {!loading ? (
          <Text style={[styles.summary, { color: colors.textSecondary }]}>
            {summary}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : lists.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            { gap: spacing.md, padding: spacing.lg, paddingBottom: 96 },
          ]}
          data={lists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ListCard list={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Fab onPress={openCreateModal} />

      <Modal
        animationType="slide"
        onRequestClose={closeCreateModal}
        transparent
        visible={modalVisible}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable onPress={closeCreateModal} style={styles.modalBackdrop} />
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

            <View style={styles.emojiRow}>
              <Text style={styles.emojiPreview}>{listEmoji}</Text>
              <TextInput
                editable={!creating}
                maxLength={4}
                onChangeText={setListEmoji}
                placeholder="📋"
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.emojiInput,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                    borderRadius: radii.item,
                    color: colors.text,
                  },
                ]}
                value={listEmoji}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Name
              </Text>
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
        </KeyboardAvoidingView>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(44, 36, 23, 0.35)',
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
  emojiRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  emojiPreview: {
    fontSize: 32,
    lineHeight: 36,
  },
  emojiInput: {
    borderWidth: 1,
    flex: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlign: 'center',
  },
  field: {
    gap: 6,
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
