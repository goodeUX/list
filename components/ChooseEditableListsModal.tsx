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

import { absoluteFill } from '@/lib/absoluteFill';
import Button from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { showAppAlert } from '@/lib/appAlert';
import { space } from '@/lib/design';
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
  const { colors, radius, space, typography, elevation } = useTheme();
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
      <Pressable
        accessibilityLabel="Dismiss"
        onPress={onDismiss}
        style={[styles.backdrop, { backgroundColor: colors.scrim }]}
      />
      <View
        style={[
          styles.dialog,
          elevation.e3,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.xl,
            gap: space[4],
            padding: space[6],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[typography.h2, { color: colors.text }]}>
            Pick {FREE_LIST_LIMIT} lists to keep editable
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            You're on the Free plan with more than {FREE_LIST_LIMIT} lists. The
            others stay safe but read-only until you upgrade or free a slot.
          </Text>
        </View>

        <View style={{ gap: space[2] }}>
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
                    backgroundColor: isSelected ? colors.primarySoft : colors.surfaceMuted,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderRadius: radius.md,
                    opacity: pressed ? 0.85 : 1,
                    padding: space[4],
                  },
                ]}
              >
                <Text style={styles.listEmoji}>{list.emoji}</Text>
                <Text numberOfLines={1} style={[typography.label, { color: colors.text }, styles.listName]}>
                  {list.name}
                </Text>
                <MaterialIcons
                  color={isSelected ? colors.primary : colors.textSecondary}
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
    ...absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[3],
    zIndex: 100,
  },
  backdrop: {
    ...absoluteFill,
  },
  dialog: {
    borderWidth: 1,
    maxWidth: CONTENT_MAX_WIDTH - 24,
    width: '100%',
    zIndex: 1,
  },
  header: { gap: space[2] },
  listRow: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: space[3],
  },
  listEmoji: { fontSize: 22, lineHeight: 26 },
  listName: {
    flex: 1,
  },
  buttonGroup: { gap: space[2] },
});
