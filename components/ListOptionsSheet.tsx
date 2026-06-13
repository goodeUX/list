import { MaterialIcons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/ThemeContext';

const DESTRUCTIVE_COLOR = '#D64545';

type ListOptionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  showDeleteList: boolean;
  onClearList: () => void;
  onDeleteList: () => void;
};

export default function ListOptionsSheet({
  visible,
  onClose,
  showDeleteList,
  onClearList,
  onDeleteList,
}: ListOptionsSheetProps) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={styles.backdrop} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderTopLeftRadius: radii.card,
              borderTopRightRadius: radii.card,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
            },
          ]}
        >
          <Pressable
            onPress={() => {
              onClose();
              onClearList();
            }}
            style={({ pressed }) => [
              styles.menuItem,
              {
                borderRadius: radii.item,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialIcons color={colors.text} name="playlist-remove" size={22} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Clear list
            </Text>
          </Pressable>

          {showDeleteList ? (
            <Pressable
              onPress={() => {
                onClose();
                onDeleteList();
              }}
              style={({ pressed }) => [
                styles.menuItem,
                {
                  borderRadius: radii.item,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <MaterialIcons color={DESTRUCTIVE_COLOR} name="delete-outline" size={22} />
              <Text style={[styles.menuItemText, { color: DESTRUCTIVE_COLOR }]}>
                Delete list
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
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
    gap: 4,
  },
  menuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 8,
  },
  menuItemText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
});
