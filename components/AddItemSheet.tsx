import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import type { ItemHistoryEntry } from '@/lib/types';

type AddItemSheetProps = {
  visible: boolean;
  onClose: () => void;
  historyEntries: ItemHistoryEntry[];
  onAddItem: (name: string, quantity?: string | null) => Promise<void>;
  adding?: boolean;
};

export default function AddItemSheet({
  visible,
  onClose,
  historyEntries,
  onAddItem,
  adding = false,
}: AddItemSheetProps) {
  const { colors, radii, spacing } = useTheme();
  const [text, setText] = useState('');

  const filteredHistory = useMemo(() => {
    const query = text.trim().toLowerCase();
    if (!query) {
      return historyEntries.slice(0, 12);
    }
    return historyEntries
      .filter((entry) => entry.name.toLowerCase().includes(query))
      .slice(0, 12);
  }, [historyEntries, text]);

  const trimmedText = text.trim();
  const exactMatch = filteredHistory.some(
    (entry) => entry.name.trim().toLowerCase() === trimmedText.toLowerCase(),
  );

  const handleAdd = async (name: string, quantity?: string | null) => {
    const trimmedName = name.trim();
    if (!trimmedName || adding) {
      return;
    }

    await onAddItem(trimmedName, quantity ?? null);
    setText('');
    onClose();
  };

  const handleClose = () => {
    if (adding) {
      return;
    }
    setText('');
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable onPress={handleClose} style={styles.backdrop} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderTopLeftRadius: radii.card,
              borderTopRightRadius: radii.card,
              padding: spacing.lg,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>Add item</Text>

          <TextInput
            autoFocus
            editable={!adding}
            onChangeText={setText}
            onSubmitEditing={() => {
              void handleAdd(text);
            }}
            placeholder="What do you need?"
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
            value={text}
          />

          {filteredHistory.length > 0 ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                From your history
              </Text>
              <ScrollView
                horizontal
                keyboardShouldPersistTaps="handled"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.sm }}
              >
                {filteredHistory.map((entry) => (
                  <Pressable
                    key={entry.id}
                    disabled={adding}
                    onPress={() => {
                      void handleAdd(entry.name, entry.quantity);
                    }}
                    style={({ pressed }) => [
                      styles.chip,
                      {
                        backgroundColor: colors.accentSoft,
                        borderRadius: radii.checkbox,
                        opacity: pressed || adding ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: colors.text }]}>
                      {entry.name}
                      {entry.quantity ? ` · ${entry.quantity}` : ''}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {trimmedText && !exactMatch ? (
            <Pressable
              disabled={adding}
              onPress={() => {
                void handleAdd(trimmedText);
              }}
              style={({ pressed }) => [
                styles.createButton,
                {
                  backgroundColor: colors.accent,
                  borderRadius: radii.item,
                  marginTop: spacing.md,
                  opacity: pressed || adding ? 0.85 : 1,
                },
              ]}
            >
              {adding ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={[styles.createButtonText, { color: colors.surface }]}>
                  Create “{trimmedText}”
                </Text>
              )}
            </Pressable>
          ) : null}

          <Pressable
            disabled={adding}
            onPress={handleClose}
            style={({ pressed }) => [
              styles.cancelButton,
              {
                borderColor: colors.border,
                borderRadius: radii.item,
                marginTop: spacing.sm,
                opacity: pressed || adding ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 36, 23, 0.35)',
  },
  sheet: {
    borderTopWidth: 1,
    gap: 8,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
  },
  createButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  createButtonText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
  },
  cancelButton: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
  },
});
