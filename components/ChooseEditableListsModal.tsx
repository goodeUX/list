import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import Button from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { showAppAlert } from '@/lib/appAlert';
import { FREE_LIST_LIMIT } from '@/lib/listLimits';
import { CONTENT_MAX_WIDTH } from '@/lib/slideTransition';
import type { AppList } from '@/lib/types';

type ChooseEditableListsModalProps = {
  visible: boolean;
  lists: AppList[];
  initialSelection: string[];
  onConfirm: (ids: string[]) => void | Promise<void>;
  onDismiss: () => void;
};

/**
 * Shown when a free account is over the list cap (after a downgrade): the
 * user picks which FREE_LIST_LIMIT lists stay editable; the rest go
 * read-only. Dismissing keeps everything read-only until they pick.
 */
export default function ChooseEditableListsModal({
  visible,
  lists,
  initialSelection,
  onConfirm,
  onDismiss,
}: ChooseEditableListsModalProps) {
  const { colors, radii, spacing } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [selected, setSelected] = useState<string[]>(initialSelection);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelected(initialSelection.filter((id) => lists.some((l) => l.id === id)));
    }
    // Re-seed only when (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) {
        return current.filter((existing) => existing !== id);
      }
      if (current.length >= FREE_LIST_LIMIT) {
        // Replace the oldest pick so tapping always responds.
        return [...current.slice(1), id];
      }
      return [...current, id];
    });
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(selected);
    } catch {
      showAppAlert('Could not save your choice', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <View
      accessibilityViewIsModal
      style={[
        styles.shell,
        Platform.OS === 'web'
          ? ({ height: windowHeight, position: 'fixed' } as object)
          : null,
      ]}
    >
      <Pressable accessibilityLabel="Dismiss" onPress={onDismiss} style={styles.backdrop} />
      <View
        style={[
          styles.dialog,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.card,
            gap: spacing.md,
            padding: spacing.lg,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Pick {FREE_LIST_LIMIT} lists to keep editable
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            You're on the Free plan with more than {FREE_LIST_LIMIT} lists. The
            others stay safe but read-only until you upgrade or free a slot.
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          {lists.map((list) => {
            const isSelected = selected.includes(list.id);
            return (
              <Pressable
                key={list.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                disabled={saving}
                onPress={() => toggle(list.id)}
                style={({ pressed }) => [
                  styles.listRow,
                  {
                    backgroundColor: isSelected ? colors.accentSoft : colors.surfaceMuted,
                    borderColor: isSelected ? colors.accent : colors.border,
                    borderRadius: radii.item,
                    opacity: pressed ? 0.85 : 1,
                    padding: spacing.md,
                  },
                ]}
              >
                <Text style={styles.listEmoji}>{list.emoji}</Text>
                <Text numberOfLines={1} style={[styles.listName, { color: colors.text }]}>
                  {list.name}
                </Text>
                <MaterialIcons
                  color={isSelected ? colors.accent : colors.textSecondary}
                  name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                  size={22}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.buttonGroup}>
          <Button
            disabled={selected.length !== FREE_LIST_LIMIT || saving}
            label="Keep these editable"
            loading={saving}
            onPress={() => void handleConfirm()}
            variant="primary"
          />
          <Button disabled={saving} label="Not now" onPress={onDismiss} variant="ghost" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 36, 23, 0.35)',
  },
  dialog: {
    borderWidth: 1,
    maxWidth: CONTENT_MAX_WIDTH - 24,
    width: '100%',
    zIndex: 1,
  },
  header: { gap: 8 },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  listRow: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
  },
  listEmoji: { fontSize: 22, lineHeight: 26 },
  listName: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
  },
  buttonGroup: { gap: 8 },
});
