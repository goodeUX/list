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
  View,
} from 'react-native';

import KeyboardDismissScrollView from '@/components/KeyboardDismissScrollView';
import ThemedTextInput from '@/components/ThemedTextInput';
import { useTheme } from '@/contexts/ThemeContext';
import { buttonLabelStyle, buttonLayoutStyle } from '@/lib/buttonStyles';
import { ITEM_NAME_LIMIT_MESSAGE, getItemNameInputUpdate } from '@/lib/itemName';
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
  const [nameLimitError, setNameLimitError] = useState(false);

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
    setNameLimitError(false);
    onClose();
  };

  const handleClose = () => {
    if (adding) {
      return;
    }
    setText('');
    setNameLimitError(false);
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
        <KeyboardDismissScrollView
          bounces={false}
          style={styles.sheetScroll}
          contentContainerStyle={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderTopLeftRadius: radii.card,
              borderTopRightRadius: radii.card,
              padding: spacing.lg,
            },
          ]}
          keyboardDismissMode="on-drag"
        >
          <Text style={[styles.title, { color: colors.text }]}>Add item</Text>

          <ThemedTextInput
            autoFocus
            editable={!adding}
            invalid={nameLimitError}
            onChangeText={(value) => {
              const { limitReached, value: limitedValue } = getItemNameInputUpdate(value);
              setNameLimitError(limitReached);
              setText(limitedValue);
            }}
            onSubmitEditing={() => {
              void handleAdd(text);
            }}
            placeholder="What do you need?"
            returnKeyType="done"
            value={text}
          />

          {nameLimitError ? (
            <Text style={[styles.limitError, { color: colors.accent }]}>
              {ITEM_NAME_LIMIT_MESSAGE}
            </Text>
          ) : null}

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
                buttonLayoutStyle,
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
                <Text style={[buttonLabelStyle(16), { color: colors.surface }]}>
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
              buttonLayoutStyle,
              {
                borderColor: colors.border,
                borderRadius: radii.item,
                marginTop: spacing.sm,
                opacity: pressed || adding ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[buttonLabelStyle(15), { color: colors.text }]}>
              Cancel
            </Text>
          </Pressable>
        </KeyboardDismissScrollView>
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
  sheetScroll: {
    flexGrow: 0,
    maxHeight: '90%',
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 4,
  },
  limitError: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
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
    minHeight: 48,
  },
  cancelButton: {
    borderWidth: 1,
    minHeight: 44,
  },
});
